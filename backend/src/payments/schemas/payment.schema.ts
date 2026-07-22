import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Order', required: true })
  order: string;

  @Prop()
  orderNumber: string;

  @Prop({ required: true })
  paymentMethod: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'EGP' })
  currency: string;

  @Prop({
    enum: [
      'pending',
      'under_review',
      'paid',
      'failed',
      'partially_refunded',
      'refunded',
    ],
    default: 'pending',
  })
  status: string;

  @Prop({ unique: true })
  reference: string;

  @Prop()
  providerReference: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  providerResponse: DynamicRecord;

  @Prop()
  receiptImage: string;

  @Prop()
  paidAt: Date;

  @Prop()
  notes: string;

  @Prop()
  statusTokenHash?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ order: 1 });
PaymentSchema.index({ status: 1 });
