import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryStatusFilter } from './dto/query-inventory.dto';

describe('InventoryController', () => {
  let controller: InventoryController;
  const mockService = {
    getCurrentStock: jest.fn(),
    getPaginatedStock: jest.fn(),
    getMovements: jest.fn(),
    createMovement: jest.fn(),
    adjustStock: jest.fn(),
    getLowStockItems: jest.fn(),
    getOutOfStockItems: jest.fn(),
    getStockReport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getInventory (paginated)', () => {
    it('should call getPaginatedStock with query params', async () => {
      const mockResult = {
        items: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
      mockService.getPaginatedStock.mockResolvedValue(mockResult);

      const result = await controller.getInventory({
        page: 1,
        limit: 20,
        search: 'test',
        status: InventoryStatusFilter.IN_STOCK,
      });

      expect(mockService.getPaginatedStock).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: 'test',
        status: InventoryStatusFilter.IN_STOCK,
      });
      expect(result).toEqual(mockResult);
    });

    it('should use defaults when no query params provided', async () => {
      const mockResult = {
        items: [
          {
            productId: '1',
            name: 'Product',
            sku: 'SKU',
            stock: 10,
            lowStockThreshold: 5,
            status: 'active',
            inStock: true,
            images: [],
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      mockService.getPaginatedStock.mockResolvedValue(mockResult);

      const result = await controller.getInventory({});

      expect(mockService.getPaginatedStock).toHaveBeenCalledWith({});
      expect(result.items).toHaveLength(1);
    });
  });
});
