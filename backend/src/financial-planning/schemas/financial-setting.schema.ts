import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FinancialSettingDocument = FinancialSetting & Document;

export enum FinancialSettingType {
  MONTHLY_FIXED_COST = 'monthly_fixed_cost',
  RENT = 'rent',
  SALARIES = 'salaries',
  UTILITIES = 'utilities',
  MARKETING = 'marketing',
  PACKAGING = 'packaging',
  DELIVERY_SUBSIDY = 'delivery_subsidy',
  SOFTWARE = 'software',
  OTHER_OPERATING = 'other_operating',
  TARGET_PROFIT = 'target_profit',
}

@Schema({ timestamps: true, collection: 'financial_settings' })
export class FinancialSetting {
  @Prop({ required: true, unique: true, trim: true })
  key: string;

  @Prop({ required: true })
  value: number;

  @Prop({ required: true, enum: FinancialSettingType })
  type: FinancialSettingType;

  @Prop({ trim: true })
  description?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  effectiveFrom?: Date;
}

export const FinancialSettingSchema =
  SchemaFactory.createForClass(FinancialSetting);
