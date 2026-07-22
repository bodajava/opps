import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryZonesController } from './delivery-zones.controller';
import { DeliveryZonesService } from './delivery-zones.service';

describe('DeliveryZonesController', () => {
  let controller: DeliveryZonesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryZonesController],
      providers: [
        {
          provide: DeliveryZonesService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            calculateDeliveryFee: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DeliveryZonesController>(DeliveryZonesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
