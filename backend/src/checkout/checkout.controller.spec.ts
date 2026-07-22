import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

describe('CheckoutController', () => {
  let controller: CheckoutController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckoutController],
      providers: [
        {
          provide: CheckoutService,
          useValue: { getQuote: jest.fn(), placeOrder: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<CheckoutController>(CheckoutController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
