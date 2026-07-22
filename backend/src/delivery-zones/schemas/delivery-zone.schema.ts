import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DeliveryZoneDocument = DeliveryZone & Document;

@Schema({ timestamps: true, collection: 'delivery_zones' })
export class DeliveryZone {
  @Prop({ required: true, unique: true, trim: true })
  governorate: string;

  @Prop({ type: [String], default: [] })
  cities: string[];

  @Prop({ required: true, min: 0 })
  deliveryFee: number;

  @Prop({ type: Number, default: null })
  freeDeliveryThreshold: number | null;

  @Prop({ default: '1-2 business days' })
  estimatedDeliveryDays: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: true })
  codAvailable: boolean;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const DeliveryZoneSchema = SchemaFactory.createForClass(DeliveryZone);
