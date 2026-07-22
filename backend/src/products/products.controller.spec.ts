import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: {
            findAll: jest.fn(),
            findBySlug: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            bulkUpdateStatus: jest.fn(),
            archive: jest.fn(),
            delete: jest.fn(),
            updateStock: jest.fn(),
            getFeatured: jest.fn(),
            getBestSellers: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes validated bulk updates to the service', async () => {
    jest
      .spyOn(service, 'bulkUpdateStatus')
      .mockResolvedValue({ updated: 2, matched: 2 });

    await expect(
      controller.bulkUpdate({
        ids: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
        isActive: false,
      }),
    ).resolves.toEqual({ updated: 2, matched: 2 });
  });
});
