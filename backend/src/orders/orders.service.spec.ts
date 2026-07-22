import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { Order } from './schemas/order.schema';
import { InventoryMovement } from '../inventory/schemas/inventory-movement.schema';
import { Product } from '../products/schemas/product.schema';
import { ProductVariant } from '../product-variants/schemas/product-variant.schema';
import { OrderNumberHelper } from '../common/helpers/order-number.helper';
import { EmailService } from '../common/providers/email.service';

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: {} },
        { provide: getModelToken(InventoryMovement.name), useValue: {} },
        { provide: getModelToken(Product.name), useValue: {} },
        { provide: getModelToken(ProductVariant.name), useValue: {} },
        {
          provide: OrderNumberHelper,
          useValue: { generate: jest.fn().mockResolvedValue('ORD-001') },
        },
        { provide: EmailService, useValue: { sendEmail: jest.fn() } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
