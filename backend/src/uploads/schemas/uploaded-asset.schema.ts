import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Schema as MongooseSchema } from 'mongoose';

export type UploadedAssetDocument = UploadedAsset & Document;

export enum AssetProvider {
  LOCAL = 'local',
  CLOUDINARY = 'cloudinary',
  S3 = 's3',
}

@Schema({ timestamps: true, collection: 'uploaded_assets' })
export class UploadedAsset {
  @Prop({ required: true, trim: true })
  filename: string;

  @Prop({ required: true, trim: true })
  originalName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop()
  size?: number;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true, enum: AssetProvider })
  provider: AssetProvider;

  @Prop({ trim: true })
  publicId?: string;

  @Prop({ trim: true })
  folder?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  uploadedBy?: string;
}

export const UploadedAssetSchema = SchemaFactory.createForClass(UploadedAsset);
