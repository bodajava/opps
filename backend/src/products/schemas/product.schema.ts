import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop()
  shortDescription: string;

  @Prop()
  fullDescription: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category' })
  category: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop()
  thumbnail: string;

  @Prop({ required: true })
  regularPrice: number;

  @Prop()
  salePrice: number;

  @Prop()
  costPrice: number;

  @Prop({ default: 0 })
  stock: number;

  @Prop({ default: 5 })
  lowStockThreshold: number;

  @Prop({ required: true, unique: true })
  sku: string;

  @Prop()
  ingredients: string;

  @Prop()
  allergens: string;

  @Prop()
  nutritionalNotes: string;

  @Prop()
  weight: number;

  @Prop()
  cookieCount: number;

  @Prop({ type: [String], default: [] })
  sizes: string[];

  @Prop({ type: [String], default: [] })
  flavors: string[];

  @Prop({ type: [String], default: [] })
  packagingOptions: string[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: true })
  inStock: boolean;

  @Prop({
    enum: ['in_stock', 'low_stock', 'out_of_stock'],
    default: 'in_stock',
  })
  status: string;

  @Prop({ default: 0 })
  ratingAverage: number;

  @Prop({ default: 0 })
  ratingCount: number;

  @Prop()
  estimatedPrepTime: number;

  @Prop({ default: false })
  isArchived: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ isFeatured: 1 });
ProductSchema.index({ isArchived: 1 });
