import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CouponUsageDocument = CouponUsage & Document;

@Schema({ timestamps: true, collection: 'couponusages' })
export class CouponUsage {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Coupon', required: true })
  coupon: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Order', required: true })
  order: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user: string;

  @Prop()
  email: string;

  @Prop({ required: true })
  discountAmount: number;
}

export const CouponUsageSchema = SchemaFactory.createForClass(CouponUsage);
