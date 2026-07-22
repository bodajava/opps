import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InventoryService } from './inventory.service';
import { InventoryMovement } from './schemas/inventory-movement.schema';
import { Product } from '../products/schemas/product.schema';
import { ProductVariant } from '../product-variants/schemas/product-variant.schema';

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getModelToken(InventoryMovement.name), useValue: {} },
        { provide: getModelToken(Product.name), useValue: {} },
        { provide: getModelToken(ProductVariant.name), useValue: {} },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
