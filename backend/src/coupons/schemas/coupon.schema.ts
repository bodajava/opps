import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CouponDocument = Coupon & Document;

@Schema({ timestamps: true, collection: 'coupons' })
export class Coupon {
  @Prop({ required: true, unique: true, uppercase: true, index: true })
  code: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: ['percentage', 'fixed'] })
  type: string;

  @Prop({ required: true })
  value: number;

  @Prop()
  maxDiscount: number;

  @Prop()
  minOrderValue: number;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  expirationDate: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  usageLimit: number;

  @Prop({ default: 1 })
  perCustomerLimit: number;

  @Prop({ default: 0 })
  usedCount: number;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'Product', default: [] })
  applicableProducts: string[];

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'Category', default: [] })
  applicableCategories: string[];

  @Prop({ default: false })
  isFirstOrderOnly: boolean;

  @Prop({
    type: String,
    enum: [
      'all',
      'new_customers',
      'returning',
      'high_value',
      'inactive',
      'specific',
    ],
    default: 'all',
  })
  audience: string;

  @Prop()
  minOrders: number;

  @Prop()
  minSpent: number;

  @Prop()
  inactiveDays: number;

  @Prop({ type: [String], default: [] })
  customerEmails: string[];
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
CouponSchema.index({ isActive: 1 });
CouponSchema.index({ startDate: 1 });
CouponSchema.index({ expirationDate: 1 });
