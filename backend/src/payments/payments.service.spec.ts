import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PaymentsService } from './payments.service';
import { Payment } from './schemas/payment.schema';
import { PaymentEvent } from './schemas/payment-event.schema';
import { PaymentRegistryService } from './payment-registry.service';
import { OrdersService } from '../orders/orders.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getModelToken(Payment.name), useValue: {} },
        { provide: getModelToken(PaymentEvent.name), useValue: {} },
        {
          provide: PaymentRegistryService,
          useValue: { getProvider: jest.fn() },
        },
        {
          provide: OrdersService,
          useValue: { findById: jest.fn(), updatePaymentStatus: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
