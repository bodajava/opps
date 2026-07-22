import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Role, RoleDocument } from '../roles/schemas/role.schema';

@Injectable()
export class AdminsService {
  private readonly logger = new Logger(AdminsService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
    private readonly configService: ConfigService,
  ) {}

  async createAdmin(dto: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    roleName: string;
  }) {
    const allowedRoles = [
      'super_admin',
      'admin',
      'order_manager',
      'product_manager',
      'inventory_manager',
      'finance_viewer',
      'support_agent',
    ];

    if (!allowedRoles.includes(dto.roleName)) {
      throw new BadRequestException(`Invalid admin role: ${dto.roleName}`);
    }

    const existingUser = await this.userModel.findOne({ email: dto.email });
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const role = await this.roleModel.findOne({ name: dto.roleName });
    if (!role) {
      throw new NotFoundException(`Role '${dto.roleName}' not found`);
    }

    const saltRounds = this.configService.get<number>(
      'app.bcryptSaltRounds',
      12,
    );
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.userModel.create({
      fullName: dto.fullName,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone || '',
      role: role._id.toString(),
      permissions: role.permissions || [],
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

  async findAllAdmins(query: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const adminRoles = await this.roleModel.find({
      name: {
        $in: [
          'super_admin',
          'admin',
          'order_manager',
          'product_manager',
          'inventory_manager',
          'finance_viewer',
          'support_agent',
        ],
      },
    });
    const adminRoleIds = adminRoles.map((r) => r._id.toString());

    const filter: DynamicRecord = { role: { $in: adminRoleIds } };
    if (query.search) {
      filter.$or = [
        { fullName: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.role) {
      const role = await this.roleModel.findOne({ name: query.role });
      if (role) filter.role = role._id.toString();
    }

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
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAdminById(id: string) {
    const adminRoles = await this.roleModel.find({
      name: {
        $in: [
          'super_admin',
          'admin',
          'order_manager',
          'product_manager',
          'inventory_manager',
          'finance_viewer',
          'support_agent',
        ],
      },
    });
    const adminRoleIds = adminRoles.map((r) => r._id.toString());

    const user = await this.userModel
      .findOne({ _id: id, role: { $in: adminRoleIds } })
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('role');

    if (!user) throw new NotFoundException('Admin not found');
    return user;
  }

  async updateAdminRole(id: string, roleName: string) {
    const allowedRoles = [
      'super_admin',
      'admin',
      'order_manager',
      'product_manager',
      'inventory_manager',
      'finance_viewer',
      'support_agent',
    ];

    if (!allowedRoles.includes(roleName)) {
      throw new BadRequestException(`Invalid admin role: ${roleName}`);
    }

    const role = await this.roleModel.findOne({ name: roleName });
    if (!role) throw new NotFoundException(`Role '${roleName}' not found`);

    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            role: role._id.toString(),
            permissions: role.permissions || [],
          },
        },
        { returnDocument: 'after' },
      )
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('role');

    if (!user) throw new NotFoundException('Admin not found');
    return user;
  }

  async deactivateAdmin(id: string) {
    const found = await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { returnDocument: 'after' },
      )
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('role');

    if (!found) throw new NotFoundException('Admin not found');
    return { message: 'Admin deactivated successfully' };
  }

  async seedAdmin() {
    const runSeed = this.configService.get<boolean>('app.runAdminSeed', false);
    if (!runSeed) return;

    const email = this.configService.get<string>('app.adminSeedEmail', '');
    const password = this.configService.get<string>(
      'app.adminSeedPassword',
      '',
    );
    const name = this.configService.get<string>(
      'app.adminSeedName',
      'opps Admin',
    );

    if (!email || !password) {
      this.logger.warn('Admin seed skipped: missing email or password config');
      return;
    }

    const existing = await this.userModel.findOne({ email });
    if (existing) {
      this.logger.log('Admin seed skipped: admin already exists');
      return;
    }

    let superAdminRole = await this.roleModel.findOne({ name: 'super_admin' });
    if (!superAdminRole) {
      superAdminRole = await this.roleModel.create({
        name: 'super_admin',
        description: 'Super administrator with full access',
        permissions: ['*'],
        isSystem: true,
      });
    }

    const saltRounds = this.configService.get<number>(
      'app.bcryptSaltRounds',
      12,
    );
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await this.userModel.create({
      fullName: name,
      email,
      password: hashedPassword,
      phone: '',
      role: superAdminRole._id.toString(),
      permissions: ['*'],
      isActive: true,
      provider: 'local',
    });

    this.logger.log(`Admin seed: super admin created with email ${email}`);
  }
}
