import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import {
  UploadedAsset,
  UploadedAssetSchema,
} from './schemas/uploaded-asset.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UploadedAsset.name, schema: UploadedAssetSchema },
    ]),
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  providers: [UploadsService],
  controllers: [UploadsController],
  exports: [UploadsService],
})
export class UploadsModule {}
