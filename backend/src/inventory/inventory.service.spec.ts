import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InventoryService } from './inventory.service';
import { InventoryMovement } from './schemas/inventory-movement.schema';
import { Product } from '../products/schemas/product.schema';
import { ProductVariant } from '../product-variants/schemas/product-variant.schema';

describe('InventoryService', () => {
  let service: InventoryService;
  const productModel = {
    find: jest.fn(),
    countDocuments: jest.fn(),
  };
  const movementModel = {};
  const variantModel = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getModelToken(InventoryMovement.name),
          useValue: movementModel,
        },
        { provide: getModelToken(Product.name), useValue: productModel },
        { provide: getModelToken(ProductVariant.name), useValue: variantModel },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns canonical boolean fields for inventory items', async () => {
    productModel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        {
          _id: { toString: () => '507f1f77bcf86cd799439011' },
          name: 'Inventory Product',
          images: ['/products/inventory.webp'],
          sku: 'INV-1',
          stock: 7,
          lowStockThreshold: 3,
          inStock: true,
          isActive: true,
        },
      ]),
    });
    productModel.countDocuments.mockResolvedValue(1);

    await expect(
      service.getPaginatedStock({ page: 1, limit: 20 }),
    ).resolves.toEqual({
      items: [
        {
          productId: '507f1f77bcf86cd799439011',
          productName: 'Inventory Product',
          productImage: '/products/inventory.webp',
          sku: 'INV-1',
          currentStock: 7,
          lowStockThreshold: 3,
          inStock: true,
          isActive: true,
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });
});
