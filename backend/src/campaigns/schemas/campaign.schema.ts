import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CampaignDocument = Campaign & Document;

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'queued'
  | 'processing'
  | 'sending'
  | 'sent'
  | 'partially_failed'
  | 'failed'
  | 'cancelled';

export type CampaignAudienceType =
  | 'all'
  | 'new_customers'
  | 'returning'
  | 'high_value'
  | 'inactive'
  | 'specific';

@Schema({ timestamps: true, collection: 'campaigns' })
export class Campaign {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  subject: string;

  @Prop()
  preheader: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  senderName: string;

  @Prop()
  senderEmail: string;

  @Prop({
    type: String,
    enum: [
      'draft',
      'scheduled',
      'queued',
      'processing',
      'sending',
      'sent',
      'partially_failed',
      'failed',
      'cancelled',
    ],
    default: 'draft',
  })
  status: CampaignStatus;

  @Prop({
    type: String,
    enum: [
      'all',
      'new_customers',
      'returning',
      'high_value',
      'inactive',
      'specific',
    ],
    default: 'all',
  })
  audience: CampaignAudienceType;

  @Prop()
  minOrders: number;

  @Prop()
  minSpent: number;

  @Prop()
  inactiveDays: number;

  @Prop({ type: [String], default: [] })
  customerEmails: string[];

  @Prop()
  scheduledAt: Date;

  @Prop()
  sentAt: Date;

  @Prop({ default: 0 })
  targetCount: number;

  @Prop({ default: 0 })
  sentCount: number;

  @Prop({ default: 0 })
  failedCount: number;

  @Prop({ type: [String], default: [] })
  sentEmails: string[];

  @Prop({ default: 0 })
  openCount: number;

  @Prop({ default: 0 })
  clickCount: number;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);
CampaignSchema.index({ status: 1 });
CampaignSchema.index({ createdAt: -1 });
