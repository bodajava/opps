import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  const mockService = {
    findAll: jest.fn(),
    findBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getActive: jest.fn(),
    getCategoryTree: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('adminFindAll', () => {
    it('should call service.findAll with query params', async () => {
      const mockResult = {
        items: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
      mockService.findAll.mockResolvedValue(mockResult);

      const result = await controller.adminFindAll({
        page: 1,
        limit: 10,
        search: 'test',
      });

      expect(mockService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'test',
      });
      expect(result).toEqual(mockResult);
    });

    it('should return paginated categories', async () => {
      const mockResult = {
        items: [{ _id: '1', name: 'Test', slug: 'test', isActive: true }],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      mockService.findAll.mockResolvedValue(mockResult);

      const result = await controller.adminFindAll({});

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });
});
