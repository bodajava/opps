import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop()
  fullName: string;

  @Prop()
  phone: string;

  @Prop()
  secondaryPhone: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Role' })
  role: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isBlocked: boolean;

  @Prop()
  lastLoginAt: Date;

  @Prop({ nullable: true })
  refreshToken: string;

  @Prop({ enum: ['local', 'google', 'facebook'], default: 'local' })
  provider: string;

  @Prop()
  socialId: string;

  @Prop()
  resetPasswordToken: string;

  @Prop()
  resetPasswordExpires: Date;

  @Prop({ default: false })
  marketingConsent: boolean;

  @Prop({ type: Date, nullable: true })
  marketingConsentAt?: Date;

  @Prop({
    enum: ['registration', 'checkout', 'account_settings', 'admin_import'],
    nullable: true,
  })
  marketingConsentSource: string;

  @Prop({ type: Date, nullable: true })
  marketingUnsubscribedAt?: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ isActive: 1 });
UserSchema.index({ role: 1 });
