import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ProductVariant,
  ProductVariantDocument,
} from './schemas/product-variant.schema';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

@Injectable()
export class ProductVariantsService {
  private readonly logger = new Logger(ProductVariantsService.name);

  constructor(
    @InjectModel(ProductVariant.name)
    private readonly variantModel: Model<ProductVariantDocument>,
  ) {}

  async findByProduct(productId: string) {
    return this.variantModel
      .find({ product: productId })
      .sort({ sortOrder: 1 })
      .exec();
  }

  async findById(id: string) {
    const variant = await this.variantModel.findById(id).exec();
    if (!variant) {
      throw new NotFoundException(`Product variant with id "${id}" not found`);
    }
    return variant;
  }

  async create(dto: CreateProductVariantDto) {
    const existingSku = await this.variantModel.findOne({ sku: dto.sku });
    if (existingSku) {
      throw new ConflictException(
        `Product variant with SKU "${dto.sku}" already exists`,
      );
    }

    return this.variantModel.create(dto);
  }

  async update(id: string, dto: UpdateProductVariantDto) {
    const variant = await this.variantModel.findById(id);
    if (!variant) {
      throw new NotFoundException(`Product variant with id "${id}" not found`);
    }

    if (dto.sku && dto.sku !== variant.sku) {
      const existingSku = await this.variantModel.findOne({
        sku: dto.sku,
        _id: { $ne: id },
      });
      if (existingSku) {
        throw new ConflictException(
          `Product variant with SKU "${dto.sku}" already exists`,
        );
      }
    }

    const updated = await this.variantModel
      .findByIdAndUpdate(id, { $set: dto }, { returnDocument: 'after' })
      .exec();

    return updated;
  }

  async delete(id: string) {
    const variant = await this.variantModel.findById(id);
    if (!variant) {
      throw new NotFoundException(`Product variant with id "${id}" not found`);
    }

    await this.variantModel.findByIdAndDelete(id);
    return { deleted: true };
  }

  async updateStock(id: string, quantity: number) {
    const variant = await this.variantModel.findById(id);
    if (!variant) {
      throw new NotFoundException(`Product variant with id "${id}" not found`);
    }

    const stock = Math.max(0, quantity);

    const updated = await this.variantModel
      .findByIdAndUpdate(id, { $set: { stock } }, { returnDocument: 'after' })
      .exec();

    return updated;
  }
}
