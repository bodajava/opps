import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentRegistryService } from './payment-registry.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            createPaymentSession: jest.fn(),
            processCallback: jest.fn(),
            getPaymentStatus: jest.fn(),
            getPaymentHistory: jest.fn(),
            refundPayment: jest.fn(),
          },
        },
        {
          provide: PaymentRegistryService,
          useValue: { getAvailableMethods: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
