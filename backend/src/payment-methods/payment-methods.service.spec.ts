import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethod } from './schemas/payment-method.schema';

describe('PaymentMethodsService', () => {
  let service: PaymentMethodsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentMethodsService,
        { provide: getModelToken(PaymentMethod.name), useValue: {} },
      ],
    }).compile();

    service = module.get<PaymentMethodsService>(PaymentMethodsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
