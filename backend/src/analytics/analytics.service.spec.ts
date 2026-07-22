import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { Order } from '../orders/schemas/order.schema';
import { Product } from '../products/schemas/product.schema';
import { Coupon } from '../coupons/schemas/coupon.schema';
import { User } from '../users/schemas/user.schema';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getModelToken(Order.name), useValue: {} },
        { provide: getModelToken(Product.name), useValue: {} },
        { provide: getModelToken(Coupon.name), useValue: {} },
        { provide: getModelToken(User.name), useValue: {} },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
