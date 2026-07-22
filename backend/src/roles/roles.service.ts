import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
  ) {}

  async create(dto: {
    name: string;
    description?: string;
    permissions?: string[];
  }) {
    const existing = await this.roleModel.findOne({ name: dto.name });
    if (existing) {
      throw new ConflictException(`Role '${dto.name}' already exists`);
    }

    const role = await this.roleModel.create({
      name: dto.name,
      description: dto.description || '',
      permissions: dto.permissions || [],
      isSystem: false,
    });

    return role;
  }

  async findAll(query: { page?: number; limit?: number; search?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: DynamicRecord = {};
    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }

    const [roles, total] = await Promise.all([
      this.roleModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.roleModel.countDocuments(filter),
    ]);

    return {
      data: roles,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const role = await this.roleModel.findById(id);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async findByName(name: string) {
    return this.roleModel.findOne({ name });
  }

  async update(
    id: string,
    dto: { name?: string; description?: string; permissions?: string[] },
  ) {
    const role = await this.roleModel.findById(id);
    if (!role) throw new NotFoundException('Role not found');

    if (role.isSystem && dto.name && dto.name !== role.name) {
      throw new BadRequestException('Cannot rename system roles');
    }

    if (dto.name) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.permissions !== undefined) role.permissions = dto.permissions;

    await role.save();
    return role;
  }

  async assignPermissions(id: string, permissions: string[]) {
    const role = await this.roleModel.findByIdAndUpdate(
      id,
      { $set: { permissions } },
      { returnDocument: 'after' },
    );
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async remove(id: string) {
    const role = await this.roleModel.findById(id);
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }
    await this.roleModel.findByIdAndDelete(id);
    return { message: 'Role deleted successfully' };
  }
}
