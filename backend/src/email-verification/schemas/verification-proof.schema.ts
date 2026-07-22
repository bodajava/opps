import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VerificationProofDocument = VerificationProof & Document;

export enum ProofPurpose {
  CHECKOUT_VERIFICATION = 'checkout_verification',
}

@Schema({ timestamps: true, collection: 'verification_proofs' })
export class VerificationProof {
  @Prop({ required: true, unique: true, index: true })
  tokenHash: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, enum: ProofPurpose })
  purpose: ProofPurpose;

  @Prop({ required: true, index: true, expires: 0 })
  expiresAt: Date;

  @Prop()
  consumedAt?: Date;
}

export const VerificationProofSchema =
  SchemaFactory.createForClass(VerificationProof);
VerificationProofSchema.index({ tokenHash: 1, consumedAt: 1 });
