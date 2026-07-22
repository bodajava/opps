import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true, collection: 'categories' })
export class Category {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop()
  description: string;

  @Prop()
  image: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category', default: null })
  parent: string;

  createdAt: Date;

  updatedAt: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
