import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Address, AddressDocument } from './schemas/address.schema';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  private readonly logger = new Logger(AddressesService.name);

  constructor(
    @InjectModel(Address.name)
    private readonly addressModel: Model<AddressDocument>,
  ) {}

  async findByUser(userId: string) {
    return this.addressModel
      .find({ user: userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .exec();
  }

  async findById(id: string, userId?: string) {
    const address = await this.addressModel.findById(id).exec();

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (userId && address.user?.toString() !== userId) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async create(userId: string, dto: CreateAddressDto) {
    const count = await this.addressModel.countDocuments({ user: userId });
    const isDefault = count === 0 ? true : dto.isDefault === true;

    if (isDefault) {
      await this.addressModel.updateMany(
        { user: userId },
        { $set: { isDefault: false } },
      );
    }

    const address = await this.addressModel.create({
      ...dto,
      user: userId,
      isDefault,
    });

    return address;
  }

  async update(id: string, userId: string, dto: UpdateAddressDto) {
    await this.findById(id, userId);

    if (dto.isDefault) {
      await this.addressModel.updateMany(
        { user: userId, _id: { $ne: id } },
        { $set: { isDefault: false } },
      );
    }

    const updated = await this.addressModel
      .findByIdAndUpdate(id, { $set: dto }, { returnDocument: 'after' })
      .exec();

    return updated;
  }

  async delete(id: string, userId: string) {
    const address = await this.findById(id, userId);
    await this.addressModel.findByIdAndDelete(id);

    const remaining = await this.addressModel
      .find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(1)
      .exec();

    if (remaining.length > 0 && address.isDefault) {
      await this.addressModel.findByIdAndUpdate(remaining[0]._id, {
        $set: { isDefault: true },
      });
    }

    return { deleted: true };
  }

  async setDefault(id: string, userId: string) {
    const address = await this.findById(id, userId);

    await this.addressModel.updateMany(
      { user: userId },
      { $set: { isDefault: false } },
    );

    address.isDefault = true;
    return address.save();
  }
}
