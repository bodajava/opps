import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Schema as MongooseSchema } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  ORDER_CONFIRMATION = 'order_confirmation',
  PAYMENT_RECEIVED = 'payment_received',
  ORDER_STATUS = 'order_status',
  ADMIN_ALERT = 'admin_alert',
  LOW_STOCK = 'low_stock',
  WELCOME = 'welcome',
}

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  })
  recipient?: string;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Object })
  data?: DynamicRecord;

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop()
  readAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
