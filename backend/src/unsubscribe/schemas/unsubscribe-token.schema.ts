import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UnsubscribeTokenDocument = UnsubscribeToken & Document;

@Schema({ timestamps: true, collection: 'unsubscribe_tokens' })
export class UnsubscribeToken {
  @Prop({ required: true, unique: true, index: true })
  tokenHash: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, enum: ['marketing_unsubscribe'] })
  purpose: string;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ type: Date, nullable: true })
  usedAt?: Date;
}

export const UnsubscribeTokenSchema =
  SchemaFactory.createForClass(UnsubscribeToken);
