import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DeliveryZone,
  DeliveryZoneDocument,
} from './schemas/delivery-zone.schema';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

@Injectable()
export class DeliveryZonesService {
  private readonly logger = new Logger(DeliveryZonesService.name);

  constructor(
    @InjectModel(DeliveryZone.name)
    private readonly deliveryZoneModel: Model<DeliveryZoneDocument>,
  ) {}

  async findAll(activeOnly = false): Promise<DeliveryZoneDocument[]> {
    const filter = activeOnly ? { isActive: true } : {};
    return this.deliveryZoneModel
      .find(filter)
      .sort({ sortOrder: 1, governorate: 1 })
      .exec();
  }

  async findById(id: string): Promise<DeliveryZoneDocument> {
    const zone = await this.deliveryZoneModel.findById(id).exec();
    if (!zone) {
      throw new NotFoundException(`Delivery zone with id "${id}" not found`);
    }
    return zone;
  }

  async findByGovernorate(governorate: string): Promise<DeliveryZoneDocument> {
    const zone = await this.deliveryZoneModel
      .findOne({ governorate: { $regex: `^${governorate}$`, $options: 'i' } })
      .exec();

    if (!zone) {
      throw new NotFoundException(
        `Delivery zone for governorate "${governorate}" not found`,
      );
    }

    return zone;
  }

  async create(dto: CreateDeliveryZoneDto): Promise<DeliveryZoneDocument> {
    return this.deliveryZoneModel.create(dto);
  }

  async update(
    id: string,
    dto: UpdateDeliveryZoneDto,
  ): Promise<DeliveryZoneDocument> {
    const zone = await this.deliveryZoneModel
      .findByIdAndUpdate(id, { $set: dto }, { returnDocument: 'after' })
      .exec();

    if (!zone) {
      throw new NotFoundException(`Delivery zone with id "${id}" not found`);
    }

    return zone;
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const zone = await this.deliveryZoneModel.findByIdAndDelete(id).exec();
    if (!zone) {
      throw new NotFoundException(`Delivery zone with id "${id}" not found`);
    }
    return { deleted: true };
  }

  async calculateDeliveryFee(
    governorate: string,
    subtotal: number,
  ): Promise<{
    deliveryFee: number;
    estimatedDays: string;
    freeDelivery: boolean;
    codAvailable: boolean;
  }> {
    const zone = await this.findByGovernorate(governorate);

    const freeDelivery =
      zone.freeDeliveryThreshold !== null &&
      zone.freeDeliveryThreshold !== undefined &&
      subtotal >= zone.freeDeliveryThreshold;

    return {
      deliveryFee: freeDelivery ? 0 : zone.deliveryFee,
      estimatedDays: zone.estimatedDeliveryDays,
      freeDelivery,
      codAvailable: zone.codAvailable,
    };
  }
}
