import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import {
  StoreSetting,
  StoreSettingSchema,
} from './schemas/store-setting.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StoreSetting.name, schema: StoreSettingSchema },
    ]),
  ],
  providers: [SettingsService],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
