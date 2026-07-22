import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Schema as MongooseSchema } from 'mongoose';

export type InventoryMovementDocument = InventoryMovement & Document;

export enum InventoryMovementType {
  ADDITION = 'addition',
  DEDUCTION = 'deduction',
  RESERVATION = 'reservation',
  RESTOCK = 'restock',
  SALE = 'sale',
  CANCELLATION = 'cancellation',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return',
}

@Schema({ timestamps: true, collection: 'inventory_movements' })
export class InventoryMovement {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Product',
    required: true,
  })
  product: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'ProductVariant',
    default: null,
  })
  variant?: string;

  @Prop({ required: true, enum: InventoryMovementType })
  type: InventoryMovementType;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  previousStock: number;

  @Prop({ required: true })
  newStock: number;

  @Prop({ trim: true })
  reference?: string;

  @Prop({ trim: true })
  reason?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  performedBy?: string;
}

export const InventoryMovementSchema =
  SchemaFactory.createForClass(InventoryMovement);

InventoryMovementSchema.index({ product: 1 });
InventoryMovementSchema.index({ type: 1 });
InventoryMovementSchema.index({ createdAt: -1 });
