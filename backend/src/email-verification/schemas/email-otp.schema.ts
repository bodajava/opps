import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmailOtpDocument = EmailOtp & Document;

export enum EmailOtpPurpose {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  CHECKOUT_VERIFICATION = 'checkout_verification',
}

@Schema({ timestamps: true, collection: 'email_otps' })
export class EmailOtp {
  @Prop({ required: true, index: true })
  email: string;

  @Prop({ required: true })
  otp: string;

  @Prop({ required: true, enum: EmailOtpPurpose })
  purpose: EmailOtpPurpose;

  @Prop({ index: true })
  verificationFlowHash?: string;

  @Prop({ required: true, index: true, expires: 0 })
  expiresAt: Date;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: 5 })
  maxAttempts: number;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop()
  consumedAt?: Date;

  @Prop()
  lastResendAt?: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const EmailOtpSchema = SchemaFactory.createForClass(EmailOtp);

EmailOtpSchema.index({ email: 1, purpose: 1 });
