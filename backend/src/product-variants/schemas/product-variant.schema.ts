import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ProductVariantDocument = ProductVariant & Document;

@Schema({ timestamps: true, collection: 'productvariants' })
export class ProductVariant {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  })
  product: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  sku: string;

  @Prop({ required: true })
  price: number;

  @Prop()
  salePrice: number;

  @Prop({ default: 0 })
  stock: number;

  @Prop({ default: 5 })
  lowStockThreshold: number;

  @Prop({
    enum: ['in_stock', 'low_stock', 'out_of_stock'],
    default: 'in_stock',
  })
  status: string;

  @Prop({ default: true })
  inStock: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({ type: Map, of: String, default: {} })
  attributes: Map<string, string>;
}

export const ProductVariantSchema =
  SchemaFactory.createForClass(ProductVariant);
ProductVariantSchema.index({ product: 1, name: 1 }, { unique: true });
