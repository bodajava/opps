import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PaymentEventDocument = PaymentEvent & Document;

@Schema({ timestamps: true, collection: 'paymentevents' })
export class PaymentEvent {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payment' })
  payment: string;

  @Prop({ required: true })
  eventType: string;

  @Prop()
  provider: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  payload: DynamicRecord;

  @Prop()
  signature: string;

  @Prop()
  ip: string;
}

export const PaymentEventSchema = SchemaFactory.createForClass(PaymentEvent);
