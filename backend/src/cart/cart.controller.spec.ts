import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { VerifiedAccountGuard } from '../common/guards/verified-account.guard';

describe('CartController', () => {
  let controller: CartController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: {
            getCart: jest.fn(),
            addToCart: jest.fn(),
            updateItem: jest.fn(),
            removeItem: jest.fn(),
            clearCart: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(VerifiedAccountGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<CartController>(CartController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
