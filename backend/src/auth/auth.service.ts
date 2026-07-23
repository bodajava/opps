import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
  ServiceUnavailableException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  AccountStatus,
  User,
  UserDocument,
} from '../users/schemas/user.schema';
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
import { LoginAttemptRedisRepository } from '../redis/login-attempt-redis.repository';
import { RateLimitRedisRepository } from '../redis/rate-limit-redis.repository';
import { RedisService } from '../redis/redis.service';
import { RateLimitException } from '../common/exceptions/rate-limit.exception';
import { EmailProducerService } from '../email-queue/email-producer.service';
import { EmailJobKind } from '../email-queue/email-job.types';
import {
  RegistrationPendingResponseDto,
  RegistrationStatus,
  VerificationChannel,
  VerifyRegistrationResponseDto,
} from './dto/registration-verification.dto';

function maskEmail(email: string): string {
  const separator = email.indexOf('@');
  if (separator <= 0) return '***';
  const local = email.slice(0, separator);
  const domain = email.slice(separator + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

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
    @Optional() private readonly loginAttempts?: LoginAttemptRedisRepository,
    @Optional() private readonly rateLimits?: RateLimitRedisRepository,
    @Optional() private readonly redisService?: RedisService,
    @Optional() private readonly emailProducer?: EmailProducerService,
  ) {}

  async register(
    dto: RegisterDto,
    _userAgent?: string,
    _ip?: string,
  ): Promise<RegistrationPendingResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existingUser = await this.userModel.findOne({
      email: normalizedEmail,
    });
    if (existingUser) {
      return this.syntheticPendingRegistration(normalizedEmail);
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

    await this.userModel.create({
      fullName: dto.fullName,
      email: normalizedEmail,
      password: hashedPassword,
      phone: dto.phone,
      role: customerRole._id.toString(),
      permissions: customerRole.permissions || [],
      isActive: true,
      accountStatus: AccountStatus.PendingVerification,
      provider: 'local',
      ...(dto.marketingConsent === true && {
        marketingConsent: true,
        marketingConsentAt: new Date(),
        marketingConsentSource: 'registration',
      }),
    });
    return this.beginRegistrationVerification(normalizedEmail);
  }

  private syntheticPendingRegistration(
    email: string,
  ): RegistrationPendingResponseDto {
    return {
      status: RegistrationStatus.PendingVerification,
      verificationChannel: VerificationChannel.Email,
      maskedDestination: maskEmail(email),
      expiresInSeconds:
        this.configService.get<number>('app.emailOtpExpiresMinutes', 10) * 60,
      resendAfterSeconds: this.configService.get<number>(
        'app.emailOtpResendSeconds',
        60,
      ),
      verificationFlowId: crypto.randomBytes(32).toString('base64url'),
    };
  }

  private async beginRegistrationVerification(
    email: string,
  ): Promise<RegistrationPendingResponseDto> {
    const verificationFlowId = crypto.randomBytes(32).toString('base64url');
    const verificationFlowHash = crypto
      .createHash('sha256')
      .update(verificationFlowId)
      .digest('hex');
    try {
      await this.emailVerificationService.sendOTP(
        email,
        EmailOtpPurpose.EMAIL_VERIFICATION,
        verificationFlowHash,
      );
    } catch (error) {
      this.logger.warn('Registration verification delivery failed');
      if (error instanceof RateLimitException) throw error;
      throw new ServiceUnavailableException(
        'Verification email could not be sent. Please try again later.',
      );
    }
    return {
      status: RegistrationStatus.PendingVerification,
      verificationChannel: VerificationChannel.Email,
      maskedDestination: maskEmail(email),
      expiresInSeconds:
        this.configService.get<number>('app.emailOtpExpiresMinutes', 10) * 60,
      resendAfterSeconds: this.configService.get<number>(
        'app.emailOtpResendSeconds',
        60,
      ),
      verificationFlowId,
    };
  }

  async verifyRegistration(
    verificationFlowId: string,
    otp: string,
    userAgent?: string,
    ip?: string,
  ): Promise<VerifyRegistrationResponseDto> {
    const email = await this.emailVerificationService.verifyRegistrationOTP(
      verificationFlowId,
      otp,
    );
    const user = await this.userModel.findOneAndUpdate(
      { email, accountStatus: AccountStatus.PendingVerification },
      {
        $set: {
          accountStatus: AccountStatus.Verified,
          emailVerifiedAt: new Date(),
        },
      },
      { returnDocument: 'after' },
    );
    if (!user) throw new BadRequestException('Invalid verification flow');
    const tokens = await this.generateTokens(user, userAgent, ip);
    try {
      if (
        this.configService.get<boolean>('app.emailQueueEnabled', false) &&
        this.emailProducer
      ) {
        await this.emailProducer.enqueue({
          kind: EmailJobKind.Welcome,
          recipient: user.email,
          operationId: user._id.toString(),
          name: user.fullName,
        });
      } else {
        await this.emailService.sendWelcome(user.email, user.fullName);
      }
    } catch {
      this.logger.warn('Post-verification welcome email delivery failed');
    }
    return { status: 'verified_authenticated', ...tokens };
  }

  async resendRegistration(
    verificationFlowId: string,
  ): Promise<{ resendAfterSeconds: number }> {
    return this.emailVerificationService.resendRegistrationOTP(
      verificationFlowId,
    );
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const remoteIp = ip || 'unavailable';
    if (this.redisService?.isEnabled()) {
      if (!this.loginAttempts)
        throw new ServiceUnavailableException(
          'Login protection is temporarily unavailable',
        );
      const maximum = this.configService.get<number>('app.loginMaxAttempts', 5);
      const lock = await this.loginAttempts.isBlocked(
        remoteIp,
        normalizedEmail,
        maximum,
      );
      if (lock.blocked) {
        throw new RateLimitException({
          code: 'LOGIN_RATE_LIMITED',
          message: 'Too many login attempts. Please try again later.',
          retryAfterSeconds: lock.retryAfterSeconds,
          limit: maximum,
          remaining: 0,
          resetAtEpochSeconds:
            Math.ceil(Date.now() / 1000) + lock.retryAfterSeconds,
        });
      }
    }
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      if (this.redisService?.isEnabled()) {
        if (!this.loginAttempts)
          throw new ServiceUnavailableException(
            'Login protection is temporarily unavailable',
          );
        const maximum = this.configService.get<number>(
          'app.loginMaxAttempts',
          5,
        );
        const attempt = await this.loginAttempts.recordFailure(
          remoteIp,
          normalizedEmail,
          maximum,
          this.configService.get<number>('app.loginAttemptWindowSeconds', 900),
          this.configService.get<number>('app.loginLockSeconds', 900),
        );
        if (attempt.blocked) {
          this.logger.warn(
            'Login temporarily blocked by distributed brute-force protection',
          );
          throw new RateLimitException({
            code: 'LOGIN_RATE_LIMITED',
            message: 'Too many login attempts. Please try again later.',
            retryAfterSeconds: attempt.retryAfterSeconds,
            limit: maximum,
            remaining: 0,
            resetAtEpochSeconds:
              Math.ceil(Date.now() / 1000) + attempt.retryAfterSeconds,
          });
        }
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.accountStatus === AccountStatus.PendingVerification) {
      const pending = await this.beginRegistrationVerification(user.email);
      throw new ForbiddenException({
        code: 'ACCOUNT_VERIFICATION_REQUIRED',
        message: 'Account verification is required before signing in.',
        ...pending,
      });
    }

    if (this.redisService?.isEnabled()) {
      if (!this.loginAttempts)
        throw new ServiceUnavailableException(
          'Login protection is temporarily unavailable',
        );
      await this.loginAttempts.clear(remoteIp, normalizedEmail);
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

  async forgotPassword(email: string, ip = 'unavailable') {
    if (this.redisService?.isEnabled()) {
      if (!this.rateLimits)
        throw new ServiceUnavailableException(
          'Password reset protection is temporarily unavailable',
        );
      const limit = this.configService.get<number>(
        'app.forgotPasswordMaxRequests',
        3,
      );
      const result = await this.rateLimits.consume(
        'auth:forgot-password',
        `${ip}:${email.trim().toLowerCase()}`,
        limit,
        this.configService.get<number>('app.forgotPasswordWindowSeconds', 900),
      );
      if (!result.allowed)
        throw new RateLimitException({
          code: 'FORGOT_PASSWORD_RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          ...result,
        });
    }
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
      if (this.configService.get<boolean>('app.emailQueueEnabled', false)) {
        if (!this.emailProducer)
          throw new ServiceUnavailableException('Email queue is unavailable');
        await this.emailProducer.enqueue({
          kind: EmailJobKind.PasswordReset,
          recipient: user.email,
          operationId: resetTokenHash,
          resetToken,
        });
      } else {
        await this.emailService.sendPasswordReset(user.email, resetToken);
      }
    } catch {
      this.logger.error('Failed to send password reset email');
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
