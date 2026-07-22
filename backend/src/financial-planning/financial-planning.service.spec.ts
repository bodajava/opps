import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FinancialPlanningService } from './financial-planning.service';
import { FinancialSetting } from './schemas/financial-setting.schema';
import { ExpenseRecord } from './schemas/expense-record.schema';
import { Order } from '../orders/schemas/order.schema';
import { Product } from '../products/schemas/product.schema';

describe('FinancialPlanningService', () => {
  let service: FinancialPlanningService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialPlanningService,
        { provide: getModelToken(FinancialSetting.name), useValue: {} },
        { provide: getModelToken(ExpenseRecord.name), useValue: {} },
        { provide: getModelToken(Order.name), useValue: {} },
        { provide: getModelToken(Product.name), useValue: {} },
      ],
    }).compile();

    service = module.get<FinancialPlanningService>(FinancialPlanningService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
