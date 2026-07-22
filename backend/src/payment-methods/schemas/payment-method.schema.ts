import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentMethodDocument = PaymentMethod & Document;

export enum PaymentMethodType {
  COD = 'cod',
  CARD = 'card',
  WALLET = 'wallet',
  BANK_TRANSFER = 'bank_transfer',
  ONLINE_WALLET = 'online_wallet',
}

@Schema({ timestamps: true, collection: 'payment_methods' })
export class PaymentMethod {
  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, enum: PaymentMethodType })
  type: PaymentMethodType;

  @Prop({ type: Object })
  instructions?: DynamicRecord;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ default: false })
  isEnabled: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({ trim: true })
  icon?: string;

  @Prop({ default: 0 })
  additionalFee: number;

  @Prop({ type: Object })
  config?: DynamicRecord;
}

export const PaymentMethodSchema = SchemaFactory.createForClass(PaymentMethod);
