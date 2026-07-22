import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Schema as MongooseSchema } from 'mongoose';

export type ExpenseRecordDocument = ExpenseRecord & Document;

@Schema({ timestamps: true, collection: 'expense_records' })
export class ExpenseRecord {
  @Prop({ required: true, trim: true })
  type: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ trim: true })
  category?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  recordedBy?: string;
}

export const ExpenseRecordSchema = SchemaFactory.createForClass(ExpenseRecord);
