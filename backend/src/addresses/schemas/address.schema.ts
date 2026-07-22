import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Schema as MongooseSchema } from 'mongoose';

export type AddressDocument = Address & Document;

@Schema({ timestamps: true, collection: 'addresses' })
export class Address {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    default: null,
  })
  user?: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  governorate: string;

  @Prop({ required: true, trim: true })
  city: string;

  @Prop({ required: true, trim: true })
  district: string;

  @Prop({ required: true, trim: true })
  street: string;

  @Prop({ trim: true })
  buildingNumber?: string;

  @Prop({ trim: true })
  floor?: string;

  @Prop({ trim: true })
  apartment?: string;

  @Prop({ trim: true })
  landmark?: string;

  @Prop({ trim: true })
  deliveryNotes?: string;

  @Prop({ default: false })
  isDefault: boolean;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

AddressSchema.index({ user: 1 });
