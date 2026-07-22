import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PaymentMethod,
  PaymentMethodDocument,
} from './schemas/payment-method.schema';

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectModel(PaymentMethod.name)
    private readonly paymentMethodModel: Model<PaymentMethodDocument>,
  ) {}

  async findAll(activeOnly = false): Promise<PaymentMethodDocument[]> {
    const filter = activeOnly ? { isActive: true, isEnabled: true } : {};
    return this.paymentMethodModel.find(filter).sort({ sortOrder: 1 }).exec();
  }

  async findByCode(code: string): Promise<PaymentMethodDocument> {
    const method = await this.paymentMethodModel.findOne({ code }).exec();
    if (!method) {
      throw new NotFoundException(`Payment method "${code}" not found`);
    }
    return method;
  }

  async create(dto: {
    code: string;
    name: string;
    description?: string;
    type: string;
    instructions?: DynamicRecord;
    isActive?: boolean;
    isEnabled?: boolean;
    sortOrder?: number;
    icon?: string;
    additionalFee?: number;
    config?: DynamicRecord;
  }): Promise<PaymentMethodDocument> {
    const existing = await this.paymentMethodModel
      .findOne({ code: dto.code })
      .exec();
    if (existing) {
      throw new ConflictException(
        `Payment method with code "${dto.code}" already exists`,
      );
    }

    const method = new this.paymentMethodModel(dto);
    return method.save();
  }

  async update(
    id: string,
    dto: Partial<{
      name: string;
      description: string;
      type: string;
      instructions: DynamicRecord;
      isActive: boolean;
      isEnabled: boolean;
      sortOrder: number;
      icon: string;
      additionalFee: number;
      config: DynamicRecord;
    }>,
  ): Promise<PaymentMethodDocument> {
    const method = await this.paymentMethodModel
      .findByIdAndUpdate(id, dto, { returnDocument: 'after' })
      .exec();
    if (!method) {
      throw new NotFoundException(`Payment method with id "${id}" not found`);
    }
    return method;
  }

  async delete(id: string): Promise<void> {
    const result = await this.paymentMethodModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Payment method with id "${id}" not found`);
    }
  }

  async getEnabledMethods(): Promise<PaymentMethodDocument[]> {
    return this.paymentMethodModel
      .find({ isActive: true, isEnabled: true })
      .sort({ sortOrder: 1 })
      .exec();
  }
}
