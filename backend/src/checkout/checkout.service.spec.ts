import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CheckoutService } from './checkout.service';
import { Product } from '../products/schemas/product.schema';
import { ProductVariant } from '../product-variants/schemas/product-variant.schema';
import { InventoryMovement } from '../inventory/schemas/inventory-movement.schema';
import { VerificationProof } from '../email-verification/schemas/verification-proof.schema';
import { CouponsService } from '../coupons/coupons.service';
import { DeliveryZonesService } from '../delivery-zones/delivery-zones.service';
import { OrdersService } from '../orders/orders.service';
import { CartService } from '../cart/cart.service';
import { PricingService } from '../common/services/pricing.service';

describe('CheckoutService', () => {
  let service: CheckoutService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: getModelToken(Product.name), useValue: {} },
        { provide: getModelToken(ProductVariant.name), useValue: {} },
        { provide: getModelToken(InventoryMovement.name), useValue: {} },
        { provide: getModelToken(VerificationProof.name), useValue: {} },
        { provide: CouponsService, useValue: { validateCoupon: jest.fn() } },
        {
          provide: DeliveryZonesService,
          useValue: { calculateDeliveryFee: jest.fn() },
        },
        {
          provide: OrdersService,
          useValue: { create: jest.fn(), findById: jest.fn() },
        },
        {
          provide: CartService,
          useValue: { getCart: jest.fn(), clearCart: jest.fn() },
        },
        { provide: PricingService, useValue: { calculate: jest.fn() } },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
