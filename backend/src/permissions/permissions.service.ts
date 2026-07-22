import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionDocument } from './schemas/permission.schema';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission.name)
    private readonly permissionModel: Model<PermissionDocument>,
  ) {}

  async create(dto: { name: string; description?: string; group?: string }) {
    const existing = await this.permissionModel.findOne({ name: dto.name });
    if (existing) {
      throw new ConflictException(`Permission '${dto.name}' already exists`);
    }

    return this.permissionModel.create({
      name: dto.name,
      description: dto.description || '',
      group: dto.group || '',
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    group?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const filter: DynamicRecord = {};
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.group) filter.group = query.group;

    const [permissions, total] = await Promise.all([
      this.permissionModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ group: 1, name: 1 }),
      this.permissionModel.countDocuments(filter),
    ]);

    return {
      data: permissions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const permission = await this.permissionModel.findById(id);
    if (!permission) throw new NotFoundException('Permission not found');
    return permission;
  }

  async findByGroup(group: string) {
    return this.permissionModel.find({ group }).sort({ name: 1 });
  }

  async update(
    id: string,
    dto: { name?: string; description?: string; group?: string },
  ) {
    const permission = await this.permissionModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { returnDocument: 'after' },
    );
    if (!permission) throw new NotFoundException('Permission not found');
    return permission;
  }

  async remove(id: string) {
    const permission = await this.permissionModel.findByIdAndDelete(id);
    if (!permission) throw new NotFoundException('Permission not found');
    return { message: 'Permission deleted successfully' };
  }
}
