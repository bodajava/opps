import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CartService } from './cart.service';
import { Cart } from './schemas/cart.schema';
import { Product } from '../products/schemas/product.schema';
import { ProductVariant } from '../product-variants/schemas/product-variant.schema';
import { CouponsService } from '../coupons/coupons.service';

describe('CartService', () => {
  let service: CartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getModelToken(Cart.name), useValue: {} },
        { provide: getModelToken(Product.name), useValue: {} },
        { provide: getModelToken(ProductVariant.name), useValue: {} },
        { provide: CouponsService, useValue: { validateCoupon: jest.fn() } },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
