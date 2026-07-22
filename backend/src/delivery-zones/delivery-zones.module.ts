import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeliveryZonesService } from './delivery-zones.service';
import { DeliveryZonesController } from './delivery-zones.controller';
import {
  DeliveryZone,
  DeliveryZoneSchema,
} from './schemas/delivery-zone.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeliveryZone.name, schema: DeliveryZoneSchema },
    ]),
  ],
  providers: [DeliveryZonesService],
  controllers: [DeliveryZonesController],
  exports: [DeliveryZonesService, MongooseModule],
})
export class DeliveryZonesModule {}
