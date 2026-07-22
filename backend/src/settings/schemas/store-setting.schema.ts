import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { SettingValue } from '../types/setting-value.type';

export type StoreSettingDocument = StoreSetting & Document;

@Schema({ timestamps: true, collection: 'store_settings' })
export class StoreSetting {
  @Prop({ required: true, unique: true, trim: true })
  key: string;

  @Prop({ required: true, type: Object })
  value: SettingValue;

  @Prop({ trim: true })
  group?: string;

  @Prop({ trim: true })
  description?: string;
}

export const StoreSettingSchema = SchemaFactory.createForClass(StoreSetting);
