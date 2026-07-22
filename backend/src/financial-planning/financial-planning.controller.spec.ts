import { Test, TestingModule } from '@nestjs/testing';
import { FinancialPlanningController } from './financial-planning.controller';
import { FinancialPlanningService } from './financial-planning.service';

describe('FinancialPlanningController', () => {
  let controller: FinancialPlanningController;
  const mockService = {
    getFinancialSettings: jest.fn(),
    updateSetting: jest.fn(),
    deleteSetting: jest.fn(),
    calculateBreakEven: jest.fn(),
    getExpenseRecords: jest.fn(),
    addExpenseRecord: jest.fn(),
    getProfitabilityReport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinancialPlanningController],
      providers: [
        {
          provide: FinancialPlanningService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<FinancialPlanningController>(
      FinancialPlanningController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('calculateBreakEven', () => {
    it('should return break-even analysis', async () => {
      const mockResult = {
        totalMonthlyFixedCosts: 50000,
        breakEvenRevenue: 100000,
        currentRevenue: 75000,
        progressPercent: 75,
      };
      mockService.calculateBreakEven.mockResolvedValue(mockResult);

      const result = await controller.calculateBreakEven();
      expect(mockService.calculateBreakEven).toHaveBeenCalled();
      expect(result).toMatchObject({
        totalMonthlyFixedCosts: 50000,
        breakEvenRevenue: 100000,
      });
    });
  });
});
