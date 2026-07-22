import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from './schemas/user.schema';
import { Role, RoleDocument } from '../roles/schemas/role.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
    private readonly configService: ConfigService,
  ) {}

  async findById(id: string) {
    const user = await this.userModel
      .findById(id)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('role');
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    return this.userModel
      .findOne({ email })
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('role');
  }

  async create(dto: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    role?: string;
  }) {
    const existingUser = await this.userModel.findOne({ email: dto.email });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const saltRounds = this.configService.get<number>(
      'app.bcryptSaltRounds',
      12,
    );
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    let roleId = dto.role;
    if (!roleId) {
      const customerRole = await this.roleModel.findOne({ name: 'customer' });
      if (customerRole) {
        roleId = customerRole._id.toString();
      }
    }

    let permissions: string[] = [];
    if (roleId) {
      const role = await this.roleModel.findById(roleId);
      if (role) {
        permissions = role.permissions || [];
      }
    }

    const user = await this.userModel.create({
      fullName: dto.fullName,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone || '',
      role: roleId,
      permissions,
      isActive: true,
      provider: 'local',
    });

    const {
      password: storedPassword,
      resetPasswordToken,
      resetPasswordExpires,
      ...safeUser
    } = user.toObject();
    void storedPassword;
    void resetPasswordToken;
    void resetPasswordExpires;
    return safeUser;
  }

  async update(
    id: string,
    dto: Partial<{
      fullName: string;
      phone: string;
      secondaryPhone: string;
      role: string;
    }>,
  ) {
    const updateData: DynamicRecord = {};
    if (dto.fullName !== undefined) updateData.fullName = dto.fullName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.secondaryPhone !== undefined)
      updateData.secondaryPhone = dto.secondaryPhone;
    if (dto.role !== undefined) {
      updateData.role = dto.role;
      const role = await this.roleModel.findById(dto.role);
      if (role) {
        updateData.permissions = role.permissions || [];
      }
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: updateData }, { returnDocument: 'after' })
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('role');

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
    isBlocked?: boolean;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: DynamicRecord = {};
    if (query.search) {
      filter.$or = [
        { fullName: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { phone: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.role) filter.role = query.role;
    if (query.isActive !== undefined) filter.isActive = query.isActive;
    if (query.isBlocked !== undefined) filter.isBlocked = query.isBlocked;

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .populate('role')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.userModel.countDocuments(filter),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateMarketingConsent(userId: string, consent: boolean) {
    const updateData: DynamicRecord = {
      marketingConsent: consent,
    };

    if (consent) {
      updateData.marketingConsentAt = new Date();
      updateData.marketingConsentSource = 'account_settings';
      updateData.marketingUnsubscribedAt = null;
    } else {
      updateData.marketingUnsubscribedAt = new Date();
    }

    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: updateData },
        { returnDocument: 'after' },
      )
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('role');

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async blockUser(id: string) {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { $set: { isBlocked: true } },
      { returnDocument: 'after' },
    );
    if (!user) throw new NotFoundException('User not found');
    return { message: 'User blocked successfully' };
  }

  async unblockUser(id: string) {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { $set: { isBlocked: false } },
      { returnDocument: 'after' },
    );
    if (!user) throw new NotFoundException('User not found');
    return { message: 'User unblocked successfully' };
  }
}
