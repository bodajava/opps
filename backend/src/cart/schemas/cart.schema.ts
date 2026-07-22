import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CartDocument = Cart & Document;

@Schema()
export class CartItem {
  @Prop({ type: MongooseSchema.Types.ObjectId })
  _id?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  product: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ProductVariant' })
  variant?: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  image: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true })
  subtotal: number;
}

@Schema({ timestamps: true, collection: 'carts' })
export class Cart {
  @Prop({ index: true })
  sessionId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  user: string;

  @Prop({ type: [CartItem], default: [] })
  items: CartItem[];

  @Prop()
  couponCode?: string;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ default: 0 })
  deliveryFee: number;

  @Prop({ default: 0 })
  subtotal: number;

  @Prop({ default: 0 })
  total: number;

  @Prop()
  expiresAt: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
