import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { CampaignsService, CampaignTargeting } from './campaigns.service';
import { Campaign } from './schemas/campaign.schema';
import { User } from '../users/schemas/user.schema';
import { Order } from '../orders/schemas/order.schema';
import { EmailService } from '../common/providers/email.service';
import { CampaignQueueService } from '../campaign-queue/campaign-queue.service';
import { UnsubscribeService } from '../unsubscribe/unsubscribe.service';

function makeFindResult(result: DynamicValue) {
  const exec = jest.fn().mockResolvedValue(result);
  return { exec };
}

function makeSortResult(result: DynamicValue) {
  const exec = jest.fn().mockResolvedValue(result);
  return { sort: jest.fn(() => ({ exec })) };
}

function makeSelectResult(result: DynamicValue) {
  const exec = jest.fn().mockResolvedValue(result);
  return { select: jest.fn(() => ({ exec })) };
}

describe('CampaignsService', () => {
  let service: CampaignsService;

  const mockCampaignModel = {
    find: jest.fn(() => makeFindResult([])),
    findById: jest.fn(() => makeFindResult(null)),
    findByIdAndUpdate: jest.fn(() => makeFindResult(null)),
    findByIdAndDelete: jest.fn(() => makeFindResult(null)),
    create: jest.fn(),
    countDocuments: jest.fn(() => makeFindResult(0)),
  };

  const mockUserModel = {
    find: jest.fn(() => makeSelectResult([])),
  };

  const mockOrderModel = {
    countDocuments: jest.fn((_filter?: DynamicRecord) => makeFindResult(0)),
    findOne: jest.fn((_filter?: DynamicRecord) => makeSortResult(null)),
  };

  const mockEmailService = {
    sendMailExternal: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: getModelToken(Campaign.name), useValue: mockCampaignModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: EmailService, useValue: mockEmailService },
        { provide: ConfigService, useValue: { get: jest.fn(() => false) } },
        {
          provide: CampaignQueueService,
          useValue: { enqueueCampaign: jest.fn() },
        },
        { provide: UnsubscribeService, useValue: { generateToken: jest.fn() } },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTargetEmails', () => {
    const baseCampaign: CampaignTargeting = {
      audience: 'all',
      customerEmails: [],
      minOrders: null,
      minSpent: null,
      inactiveDays: null,
    };

    it('returns all active users for audience=all', async () => {
      mockUserModel.find.mockReturnValue(
        makeSelectResult([{ email: 'a@test.com' }, { email: 'b@test.com' }]),
      );
      const result = await service.getTargetEmails({
        ...baseCampaign,
        audience: 'all',
      });
      expect(result).toEqual(['a@test.com', 'b@test.com']);
    });

    it('returns customerEmails for audience=specific', async () => {
      const result = await service.getTargetEmails({
        ...baseCampaign,
        audience: 'specific',
        customerEmails: ['vip@test.com', 'vip2@test.com'],
      });
      expect(result).toEqual(['vip@test.com', 'vip2@test.com']);
    });

    it('filters by new_customers (0 orders)', async () => {
      const u1Exec = jest.fn().mockResolvedValue(0);
      const u2Exec = jest.fn().mockResolvedValue(5);
      mockOrderModel.countDocuments.mockImplementation(
        (filter?: DynamicRecord) => {
          if (!filter) return { exec: u2Exec };
          return filter.user === 'u1' ? { exec: u1Exec } : { exec: u2Exec };
        },
      );
      mockUserModel.find.mockReturnValue(
        makeSelectResult([
          { _id: 'u1', email: 'new@test.com' },
          { _id: 'u2', email: 'old@test.com' },
        ]),
      );
      const result = await service.getTargetEmails({
        ...baseCampaign,
        audience: 'new_customers',
      });
      expect(result).toEqual(['new@test.com']);
    });

    it('filters by high_value with minSpent', async () => {
      const bigExec = jest
        .fn()
        .mockResolvedValue({ total: 10000, createdAt: new Date() });
      const smallExec = jest
        .fn()
        .mockResolvedValue({ total: 50, createdAt: new Date() });
      mockOrderModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(2),
      });
      mockOrderModel.findOne.mockImplementation((filter?: DynamicRecord) => {
        if (!filter) return { sort: jest.fn(() => ({ exec: smallExec })) };
        return filter.user === 'u1'
          ? { sort: jest.fn(() => ({ exec: bigExec })) }
          : { sort: jest.fn(() => ({ exec: smallExec })) };
      });
      mockUserModel.find.mockReturnValue(
        makeSelectResult([
          { _id: 'u1', email: 'big@test.com' },
          { _id: 'u2', email: 'small@test.com' },
        ]),
      );
      const result = await service.getTargetEmails({
        ...baseCampaign,
        audience: 'high_value',
        minSpent: 1000,
      });
      expect(result).toEqual(['big@test.com']);
    });
  });

  describe('sendCampaign safety', () => {
    it('rejects bulk send when queue is disabled', async () => {
      const configGet = jest.fn((key: string) => {
        if (key === 'app.campaignQueueEnabled') return false;
        return undefined;
      });
      const module = await Test.createTestingModule({
        providers: [
          CampaignsService,
          {
            provide: getModelToken(Campaign.name),
            useValue: mockCampaignModel,
          },
          { provide: getModelToken(User.name), useValue: mockUserModel },
          { provide: getModelToken(Order.name), useValue: mockOrderModel },
          { provide: EmailService, useValue: mockEmailService },
          { provide: ConfigService, useValue: { get: configGet } },
          {
            provide: CampaignQueueService,
            useValue: { enqueueCampaign: jest.fn() },
          },
          {
            provide: UnsubscribeService,
            useValue: { generateToken: jest.fn() },
          },
        ],
      }).compile();
      const svc = module.get<CampaignsService>(CampaignsService);
      mockCampaignModel.findById.mockReturnValue(
        makeFindResult({ _id: 'c1', status: 'draft' }),
      );
      await expect(svc.sendCampaign('c1')).rejects.toThrow('disabled');
    });

    it('rejects sending already-sent campaign when queue enabled', async () => {
      const configGet = jest.fn((key: string) => {
        if (key === 'app.campaignQueueEnabled') return true;
        return undefined;
      });
      const module = await Test.createTestingModule({
        providers: [
          CampaignsService,
          {
            provide: getModelToken(Campaign.name),
            useValue: mockCampaignModel,
          },
          { provide: getModelToken(User.name), useValue: mockUserModel },
          { provide: getModelToken(Order.name), useValue: mockOrderModel },
          { provide: EmailService, useValue: mockEmailService },
          { provide: ConfigService, useValue: { get: configGet } },
          {
            provide: CampaignQueueService,
            useValue: { enqueueCampaign: jest.fn() },
          },
          {
            provide: UnsubscribeService,
            useValue: { generateToken: jest.fn() },
          },
        ],
      }).compile();
      const svc = module.get<CampaignsService>(CampaignsService);
      mockCampaignModel.findById.mockReturnValue(
        makeFindResult({ _id: 'c1', status: 'sent' }),
      );
      await expect(svc.sendCampaign('c1')).rejects.toThrow('"sent"');
    });

    it('rejects sending campaign in sending status when queue enabled', async () => {
      const configGet = jest.fn((key: string) => {
        if (key === 'app.campaignQueueEnabled') return true;
        return undefined;
      });
      const module = await Test.createTestingModule({
        providers: [
          CampaignsService,
          {
            provide: getModelToken(Campaign.name),
            useValue: mockCampaignModel,
          },
          { provide: getModelToken(User.name), useValue: mockUserModel },
          { provide: getModelToken(Order.name), useValue: mockOrderModel },
          { provide: EmailService, useValue: mockEmailService },
          { provide: ConfigService, useValue: { get: configGet } },
          {
            provide: CampaignQueueService,
            useValue: { enqueueCampaign: jest.fn() },
          },
          {
            provide: UnsubscribeService,
            useValue: { generateToken: jest.fn() },
          },
        ],
      }).compile();
      const svc = module.get<CampaignsService>(CampaignsService);
      mockCampaignModel.findById.mockReturnValue(
        makeFindResult({ _id: 'c1', status: 'sending' }),
      );
      await expect(svc.sendCampaign('c1')).rejects.toThrow('"sending"');
    });
  });

  describe('create', () => {
    it('creates a draft campaign', async () => {
      mockCampaignModel.create.mockResolvedValue({
        _id: 'c1',
        name: 'Test',
        status: 'draft',
      });
      const result = await service.create({
        name: 'Test',
        subject: 'Hello',
        content: '<p>Hi</p>',
      });
      expect(result).toBeDefined();
    });
  });

  describe('delete', () => {
    it('deletes existing campaign', async () => {
      mockCampaignModel.findByIdAndDelete.mockReturnValue(
        makeFindResult({ _id: 'c1' }),
      );
      const result = await service.delete('c1');
      expect(result.deleted).toBe(true);
    });

    it('throws on non-existent campaign', async () => {
      mockCampaignModel.findByIdAndDelete.mockReturnValue(makeFindResult(null));
      await expect(service.delete('nonexistent')).rejects.toThrow('not found');
    });
  });
});
