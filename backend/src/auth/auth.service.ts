import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Role, RoleDocument } from '../roles/schemas/role.schema';
import {
  RefreshToken,
  RefreshTokenDocument,
} from '../refresh-tokens/schemas/refresh-token.schema';
import { EmailService } from '../common/providers/email.service';
import { EmailVerificationService } from '../email-verification/email-verification.service';
import { EmailOtpPurpose } from '../email-verification/schemas/email-otp.schema';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  async register(dto: RegisterDto, userAgent?: string, ip?: string) {
    const existingUser = await this.userModel.findOne({ email: dto.email });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const saltRounds = this.configService.get<number>(
      'app.bcryptSaltRounds',
      12,
    );
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    let customerRole = await this.roleModel.findOne({ name: 'customer' });
    if (!customerRole) {
      customerRole = await this.roleModel.create({
        name: 'customer',
        description: 'Regular customer',
        isSystem: true,
        permissions: [],
      });
    }

    try {
      await this.emailVerificationService.sendOTP(
        dto.email,
        EmailOtpPurpose.EMAIL_VERIFICATION,
      );
    } catch (error) {
      this.logger.warn(
        'Registration blocked because verification email could not be sent',
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        'Verification email could not be sent. Please try again later.',
      );
    }

    const user = await this.userModel.create({
      fullName: dto.fullName,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone,
      role: customerRole._id.toString(),
      permissions: customerRole.permissions || [],
      isActive: true,
      provider: 'local',
      ...(dto.marketingConsent === true && {
        marketingConsent: true,
        marketingConsentAt: new Date(),
        marketingConsentSource: 'registration',
      }),
    });

    return this.generateTokens(user, userAgent, ip);
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.userModel.findByIdAndUpdate(user._id, {
      lastLoginAt: new Date(),
    });

    return this.generateTokens(user, userAgent, ip);
  }

  async refreshTokens(refreshToken: string, userAgent?: string, ip?: string) {
    const storedToken = await this.refreshTokenModel.findOne({
      token: refreshToken,
      isRevoked: false,
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (new Date() > storedToken.expiresAt) {
      await this.refreshTokenModel.findByIdAndUpdate(storedToken._id, {
        isRevoked: true,
      });
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await this.userModel.findById(storedToken.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    await this.refreshTokenModel.findByIdAndUpdate(storedToken._id, {
      isRevoked: true,
    });

    const tokens = await this.generateTokens(user, userAgent, ip);

    await this.refreshTokenModel.findByIdAndUpdate(storedToken._id, {
      replacedBy: tokens.refreshToken,
    });

    return tokens;
  }

  async logout(userId: string, refreshToken: string) {
    await this.refreshTokenModel.findOneAndUpdate(
      { userId, token: refreshToken, isRevoked: false },
      { isRevoked: true },
    );
  }

  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      return {
        message: 'If that email exists, a password reset link has been sent',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.userModel.findByIdAndUpdate(user._id, {
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: expiresAt,
    });

    try {
      await this.emailService.sendPasswordReset(user.email, resetToken);
    } catch (error) {
      this.logger.error(
        'Failed to send password reset email',
        error instanceof Error ? error.message : error,
      );
    }

    return {
      message: 'If that email exists, a password reset link has been sent',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await this.userModel.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const saltRounds = this.configService.get<number>(
      'app.bcryptSaltRounds',
      12,
    );
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.userModel.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    await this.refreshTokenModel.updateMany(
      { userId: user._id.toString(), isRevoked: false },
      { isRevoked: true },
    );

    return { message: 'Password has been reset successfully' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const saltRounds = this.configService.get<number>(
      'app.bcryptSaltRounds',
      12,
    );
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
    });

    await this.refreshTokenModel.updateMany(
      { userId: userId.toString(), isRevoked: false },
      { isRevoked: true },
    );

    return { message: 'Password changed successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('role');
    return user;
  }

  async generateTokens(
    user: UserDocument,
    userAgent?: string,
    ip?: string,
  ): Promise<{
    user: DynamicRecord;
    accessToken: string;
    refreshToken: string;
  }> {
    const roleId = user.role?.toString() || '';
    const roleDoc = roleId
      ? await this.roleModel.findById(roleId).lean()
      : null;
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: roleDoc?.name || '',
      permissions: user.permissions || [],
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshTokenValue = crypto.randomBytes(40).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.refreshTokenModel.create({
      userId: user._id.toString(),
      token: refreshTokenValue,
      expiresAt,
      userAgent: userAgent || '',
      ip: ip || '',
      isRevoked: false,
    });

    const userObj = user.toObject<DynamicRecord>();
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;

    return {
      user: userObj,
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserDocument | null> {
    const user = await this.userModel
      .findOne({ email })
      .select('+password')
      .exec();
    if (!user) return null;

    if (!user.isActive || user.isBlocked) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    return user;
  }
}
