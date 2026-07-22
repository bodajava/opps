import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DeliveryZonesService } from './delivery-zones.service';
import { DeliveryZone } from './schemas/delivery-zone.schema';

describe('DeliveryZonesService', () => {
  let service: DeliveryZonesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryZonesService,
        { provide: getModelToken(DeliveryZone.name), useValue: {} },
      ],
    }).compile();

    service = module.get<DeliveryZonesService>(DeliveryZonesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
