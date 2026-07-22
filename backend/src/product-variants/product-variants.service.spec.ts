import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ProductVariantsService } from './product-variants.service';
import { ProductVariant } from './schemas/product-variant.schema';

describe('ProductVariantsService', () => {
  let service: ProductVariantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductVariantsService,
        { provide: getModelToken(ProductVariant.name), useValue: {} },
      ],
    }).compile();

    service = module.get<ProductVariantsService>(ProductVariantsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
