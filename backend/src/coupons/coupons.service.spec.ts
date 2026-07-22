import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CouponsService } from './coupons.service';
import { Coupon } from './schemas/coupon.schema';
import { CouponUsage } from './schemas/coupon-usage.schema';
import { User } from '../users/schemas/user.schema';
import { Order } from '../orders/schemas/order.schema';

function makeQuery(result: DynamicValue) {
  const exec = jest.fn().mockResolvedValue(result);
  const sort = jest.fn(() => ({ exec }));
  const select = jest.fn(() => ({ exec, sort }));
  const populate = jest.fn(() => ({ exec, sort, select }));
  const lean = jest.fn(() => ({ exec }));
  return { exec, sort, select, populate, lean };
}

function makeCount(value: number) {
  const exec = jest.fn().mockResolvedValue(value);
  return { exec };
}

function makeFindById(user: DynamicValue) {
  const exec = jest.fn().mockResolvedValue(user);
  const select = jest.fn(() => ({ exec }));
  return { exec, select };
}

describe('CouponsService', () => {
  let service: CouponsService;

  const mockCouponModel = {
    find: jest.fn(() => makeQuery([])),
    findById: jest.fn(() => makeQuery(null)),
    findOne: jest.fn(() => makeQuery(null)),
    findByIdAndUpdate: jest.fn(() => makeQuery(null)),
    findByIdAndDelete: jest.fn(() => makeQuery(null)),
    create: jest.fn(),
    countDocuments: jest.fn(() => makeQuery(0)),
  };

  const mockCouponUsageModel = {
    countDocuments: jest.fn(() => makeCount(0)),
    deleteMany: jest.fn(),
    find: jest.fn(() => makeQuery([])),
    create: jest.fn(),
  };

  const mockUserModel = {
    find: jest.fn(() => makeQuery([])),
    findOne: jest.fn(() => makeQuery(null)),
    findById: jest.fn(() => makeFindById(null)),
  };

  const mockOrderModel = {
    countDocuments: jest.fn().mockResolvedValue(0),
    findOne: jest.fn(() => makeQuery(null)),
    aggregate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: getModelToken(Coupon.name), useValue: mockCouponModel },
        {
          provide: getModelToken(CouponUsage.name),
          useValue: mockCouponUsageModel,
        },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAudience', () => {
    function mockCouponFindOne(coupon: DynamicRecord) {
      mockCouponModel.findOne.mockReturnValue(makeQuery(coupon));
    }

    function mockUserFindOne(user: DynamicRecord | null) {
      mockUserModel.findOne.mockReturnValue(makeQuery(user));
    }

    function mockUserFindById(user: DynamicRecord | null) {
      mockUserModel.findById.mockReturnValue(makeFindById(user));
    }

    const runValidate = async (
      couponOverrides: DynamicRecord,
      email: string | null,
      userId?: string,
    ) => {
      const coupon = {
        _id: 'coupon1',
        code: 'TEST',
        isActive: true,
        startDate: new Date(Date.now() - 86400000),
        expirationDate: new Date(Date.now() + 86400000),
        minOrderValue: null,
        usageLimit: null,
        usedCount: 0,
        perCustomerLimit: 1,
        applicableProducts: [],
        applicableCategories: [],
        audience: 'all',
        customerEmails: [],
        minSpent: null,
        minOrders: null,
        inactiveDays: null,
        ...couponOverrides,
      };
      mockCouponFindOne(coupon);
      mockCouponUsageModel.countDocuments.mockReturnValue(makeCount(0));

      return service
        .validateCoupon('TEST', 100, undefined, email || undefined, userId)
        .catch((e) => e);
    };

    describe('audience = all', () => {
      it('allows any email', async () => {
        mockUserFindOne({
          _id: '6439b5d3e8a1b2c3d4e5f6a7',
          email: 'any@test.com',
        });
        const result = await runValidate({ audience: 'all' }, 'any@test.com');
        expect(result.discount).toBeDefined();
      });

      it('allows without email', async () => {
        const result = await runValidate({ audience: 'all' }, null);
        expect(result.discount).toBeDefined();
      });
    });

    describe('audience = specific', () => {
      it('allows email in customerEmails list', async () => {
        const result = await runValidate(
          { audience: 'specific', customerEmails: ['vip@test.com'] },
          'vip@test.com',
        );
        expect(result.discount).toBeDefined();
      });

      it('rejects email NOT in customerEmails list', async () => {
        const err = await runValidate(
          { audience: 'specific', customerEmails: ['vip@test.com'] },
          'stranger@test.com',
        );
        expect(err.message).toBe(
          'This coupon is not available for your account',
        );
      });

      it('rejects when no email provided (no identity)', async () => {
        const err = await runValidate(
          { audience: 'specific', customerEmails: ['vip@test.com'] },
          null,
        );
        expect(err.message).toBe('You must be logged in to use this coupon');
      });

      it('resolves identity from authenticatedUserId', async () => {
        mockUserFindById({
          _id: '6439b5d3e8a1b2c3d4e5f6a7',
          email: 'vip@test.com',
        });
        const result = await runValidate(
          { audience: 'specific', customerEmails: ['vip@test.com'] },
          null,
          '6439b5d3e8a1b2c3d4e5f6a7',
        );
        expect(result.discount).toBeDefined();
      });

      it('rejects authenticated user not in customerEmails list', async () => {
        mockUserFindById({
          _id: '6439b5d3e8a1b2c3d4e5f6a7',
          email: 'other@test.com',
        });
        const err = await runValidate(
          { audience: 'specific', customerEmails: ['vip@test.com'] },
          null,
          '6439b5d3e8a1b2c3d4e5f6a7',
        );
        expect(err.message).toBe(
          'This coupon is not available for your account',
        );
      });
    });

    describe('audience = new_customers', () => {
      it('allows user with 0 qualified orders', async () => {
        mockUserFindOne({
          _id: '6439b5d3e8a1b2c3d4e5f6a7',
          email: 'new@test.com',
        });
        mockOrderModel.countDocuments.mockResolvedValue(0);
        mockOrderModel.aggregate.mockResolvedValue([]);
        const result = await runValidate(
          { audience: 'new_customers' },
          'new@test.com',
        );
        expect(result.discount).toBeDefined();
      });

      it('allows guest (no user account) for new_customers', async () => {
        mockUserFindOne(null);
        const result = await runValidate(
          { audience: 'new_customers' },
          'guest@test.com',
        );
        expect(result.discount).toBeDefined();
      });

      it('rejects user with 1+ qualified orders', async () => {
        mockUserFindOne({
          _id: '6439b5d3e8a1b2c3d4e5f6a7',
          email: 'old@test.com',
        });
        mockOrderModel.countDocuments.mockResolvedValue(1);
        mockOrderModel.aggregate.mockResolvedValue([{ total: 500 }]);
        const err = await runValidate(
          { audience: 'new_customers' },
          'old@test.com',
        );
        expect(err.message).toBe('This coupon is for new customers only');
      });
    });

    describe('audience = returning', () => {
      it('allows user with 1+ qualified orders', async () => {
        mockUserFindOne({
          _id: '6439b5d3e8a1b2c3d4e5f6a7',
          email: 'ret@test.com',
        });
        mockOrderModel.countDocuments.mockResolvedValue(3);
        mockOrderModel.aggregate.mockResolvedValue([{ total: 1500 }]);
        const result = await runValidate(
          { audience: 'returning' },
          'ret@test.com',
        );
        expect(result.discount).toBeDefined();
      });

      it('rejects user with 0 qualified orders', async () => {
        mockUserFindOne({
          _id: '6439b5d3e8a1b2c3d4e5f6a7',
          email: 'new@test.com',
        });
        mockOrderModel.countDocuments.mockResolvedValue(0);
        mockOrderModel.aggregate.mockResolvedValue([]);
        const err = await runValidate(
          { audience: 'returning' },
          'new@test.com',
        );
        expect(err.message).toBe('This coupon is for returning customers only');
      });

      it('rejects guest (no user account)', async () => {
        mockUserFindOne(null);
        const err = await runValidate(
          { audience: 'returning' },
          'guest@test.com',
        );
        expect(err.message).toBe(
          'This coupon is not available for guest customers',
        );
      });
    });

    describe('audience = high_value', () => {
      it('allows user meeting minSpent threshold (cumulative)', async () => {
        mockUserFindOne({
          _id: '6439b5d3e8a1b2c3d4e5f6a7',
          email: 'big@test.com',
        });
        mockOrderModel.countDocuments.mockResolvedValue(5);
        mockOrderModel.aggregate.mockResolvedValue([{ total: 10000 }]);
        const result = await runValidate(
          { audience: 'high_value', minSpent: 5000 },
          'big@test.com',
        );
        expect(result.discount).toBeDefined();
      });

      it('allows user meeting minOrders threshold', async () => {
        mockUserFindOne({
          _id: '6439b5d3e8a1b2c3d4e5f6a7',
          email: 'freq@test.com',
        });
        mockOrderModel.countDocuments.mockResolvedValue(10);
        mockOrderModel.aggregate.mockResolvedValue([{ total: 3000 }]);
        const result = await runValidate(
          { audience: 'high_value', minOrders: 5 },
          'freq@test.com',
        );
        expect(result.discount).toBeDefined();
      });

      it('rejects user with total spend below minSpent (aggregated)', async () => {
        mockUserFindOne({
          _id: '6439b5d3e8a1b2c3d4e5f6a7',
          email: 'small@test.com',
        });
        mockOrderModel.countDocuments.mockResolvedValue(3);
        mockOrderModel.aggregate.mockResolvedValue([{ total: 100 }]);
        const err = await runValidate(
          { audience: 'high_value', minSpent: 500 },
          'small@test.com',
        );
        expect(err.message).toContain('Minimum total spend');
      });

      it('rejects user with 0 qualified orders', async () => {
        mockUserFindOne({
          _id: '6439b5d3e8a1b2c3d4e5f6a7',
          email: 'none@test.com',
        });
        mockOrderModel.countDocuments.mockResolvedValue(0);
        mockOrderModel.aggregate.mockResolvedValue([]);
        const err = await runValidate(
          { audience: 'high_value' },
          'none@test.com',
        );
        expect(err.message).toBe(
          'This coupon is for high-value customers only',
        );
      });
    });

    describe('audience = inactive', () => {
      it('allows user with last order older than inactiveDays', async () => {
        const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        mockUserFindOne({
          _id: '6439b5d3e8a1b2c3d4e5f6a7',
          email: 'old@test.com',
        });
        mockOrderModel.countDocuments.mockResolvedValue(2);
        mockOrderModel.aggregate.mockResolvedValue([{ total: 1000 }]);
        mockOrderModel.findOne.mockReturnValue(
          makeQuery({ createdAt: oldDate }),
        );
        const result = await runValidate(
          { audience: 'inactive', inactiveDays: 30 },
          'old@test.com',
        );
        expect(result.discount).toBeDefined();
      });

      it('rejects user with recent order (within inactiveDays)', async () => {
        const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
        mockUserFindOne({
          _id: '6439b5d3e8a1b2c3d4e5f6a7',
          email: 'active@test.com',
        });
        mockOrderModel.countDocuments.mockResolvedValue(2);
        mockOrderModel.aggregate.mockResolvedValue([{ total: 1000 }]);
        mockOrderModel.findOne.mockReturnValue(
          makeQuery({ createdAt: recentDate }),
        );
        const err = await runValidate(
          { audience: 'inactive', inactiveDays: 30 },
          'active@test.com',
        );
        expect(err.message).toContain('inactive');
      });

      it('rejects user with 0 qualified orders', async () => {
        mockUserFindOne({
          _id: '6439b5d3e8a1b2c3d4e5f6a7',
          email: 'never@test.com',
        });
        mockOrderModel.countDocuments.mockResolvedValue(0);
        mockOrderModel.aggregate.mockResolvedValue([]);
        const err = await runValidate(
          { audience: 'inactive' },
          'never@test.com',
        );
        expect(err.message).toBe('This coupon is for existing customers only');
      });
    });
  });

  describe('create with audience config validation', () => {
    it('rejects specific audience without customerEmails', async () => {
      mockCouponModel.findOne.mockReturnValue(makeQuery(null));
      await expect(
        service.create({
          code: 'BADSPEC',
          type: 'percentage',
          value: 10,
          startDate: new Date(),
          expirationDate: new Date(Date.now() + 86400000),
          audience: 'specific',
        }),
      ).rejects.toThrow('requires at least one customer email');
    });

    it('rejects high_value without minSpent or minOrders', async () => {
      mockCouponModel.findOne.mockReturnValue(makeQuery(null));
      await expect(
        service.create({
          code: 'BADHV',
          type: 'percentage',
          value: 10,
          startDate: new Date(),
          expirationDate: new Date(Date.now() + 86400000),
          audience: 'high_value',
        }),
      ).rejects.toThrow('requires minSpent and/or minOrders');
    });

    it('rejects inactive without inactiveDays', async () => {
      mockCouponModel.findOne.mockReturnValue(makeQuery(null));
      await expect(
        service.create({
          code: 'BADINACT',
          type: 'percentage',
          value: 10,
          startDate: new Date(),
          expirationDate: new Date(Date.now() + 86400000),
          audience: 'inactive',
        }),
      ).rejects.toThrow('requires inactiveDays');
    });

    it('allows all audience without extra fields', async () => {
      mockCouponModel.findOne.mockReturnValue(makeQuery(null));
      mockCouponModel.create.mockResolvedValue({ _id: 'c1', code: 'ALLGOOD' });
      const result = await service.create({
        code: 'ALLGOOD',
        type: 'percentage',
        value: 10,
        startDate: new Date(),
        expirationDate: new Date(Date.now() + 86400000),
        audience: 'all',
      });
      expect(result).toBeDefined();
    });
  });
});
