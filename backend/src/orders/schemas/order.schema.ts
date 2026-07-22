import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ _id: false })
export class ShippingAddress {
  @Prop({ required: true })
  street: string;

  @Prop()
  apartment: string;

  @Prop()
  building: string;

  @Prop()
  floor: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  state: string;

  @Prop({ default: '' })
  zipCode: string;

  @Prop({ required: true })
  country: string;

  @Prop()
  landmark: string;
}

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  product: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ProductVariant' })
  variant: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  image: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ required: true })
  totalPrice: number;
}

@Schema({ _id: false })
export class StatusHistoryEntry {
  @Prop()
  previousStatus?: string;

  @Prop({ required: true })
  newStatus: string;

  @Prop()
  changedBy: string;

  @Prop({ default: Date.now })
  changedAt: Date;

  @Prop()
  note: string;
}

@Schema({ timestamps: true, collection: 'orders' })
export class Order {
  @Prop({ required: true, unique: true, index: true })
  orderNumber: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user: string;

  @Prop({ required: true, index: true })
  customerEmail: string;

  @Prop({ required: true })
  customerPhone: string;

  @Prop({ required: true })
  customerName: string;

  @Prop({ type: ShippingAddress, required: true })
  shippingAddress: ShippingAddress;

  @Prop({ type: [OrderItem], required: true })
  items: OrderItem[];

  @Prop({ required: true })
  subtotal: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ default: 0 })
  deliveryFee: number;

  @Prop({ required: true })
  total: number;

  @Prop()
  couponCode: string;

  @Prop({ required: true })
  paymentMethod: string;

  @Prop({
    enum: [
      'unpaid',
      'paid',
      'under_review',
      'failed',
      'partially_refunded',
      'refunded',
    ],
    default: 'unpaid',
  })
  paymentStatus: string;

  @Prop({
    enum: [
      'pending',
      'confirmed',
      'processing',
      'ready_for_delivery',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'returned',
      'refunded',
    ],
    default: 'pending',
  })
  orderStatus: string;

  @Prop({ type: [StatusHistoryEntry], default: [] })
  statusHistory: StatusHistoryEntry[];

  @Prop()
  customerNotes: string;

  @Prop()
  adminNotes: string;

  @Prop({ default: false })
  isGuest: boolean;

  @Prop()
  estimatedDeliveryDate: Date;

  @Prop()
  deliveredAt: Date;

  @Prop()
  cancelledAt: Date;

  @Prop()
  cancellationReason: string;

  @Prop({ unique: true, sparse: true })
  idempotencyKey: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.virtual('status').get(function (this: OrderDocument) {
  return this.orderStatus;
});
OrderSchema.set('toJSON', { virtuals: true });
OrderSchema.set('toObject', { virtuals: true });

OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ createdAt: -1 });
