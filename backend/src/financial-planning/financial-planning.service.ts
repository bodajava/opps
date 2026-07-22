import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  FinancialSetting,
  FinancialSettingDocument,
  FinancialSettingType,
} from './schemas/financial-setting.schema';
import {
  ExpenseRecord,
  ExpenseRecordDocument,
} from './schemas/expense-record.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { UpdateFinancialSettingDto } from './dto/update-financial-setting.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class FinancialPlanningService {
  constructor(
    @InjectModel(FinancialSetting.name)
    private readonly financialSettingModel: Model<FinancialSettingDocument>,
    @InjectModel(ExpenseRecord.name)
    private readonly expenseRecordModel: Model<ExpenseRecordDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async getFinancialSettings() {
    const settings = await this.financialSettingModel
      .find()
      .sort({ key: 1 })
      .exec();
    return settings;
  }

  async updateSetting(dto: UpdateFinancialSettingDto) {
    const setting = await this.financialSettingModel
      .findOneAndUpdate(
        { key: dto.key },
        {
          $set: {
            value: dto.value,
            type: dto.type,
            description: dto.description,
          },
        },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();
    return setting;
  }

  async deleteSetting(key: string) {
    const result = await this.financialSettingModel
      .findOneAndDelete({ key })
      .exec();
    if (!result) {
      throw new NotFoundException(`Financial setting "${key}" not found`);
    }
    return { deleted: true };
  }

  async addExpenseRecord(dto: CreateExpenseDto) {
    const record = await this.expenseRecordModel.create({
      type: dto.type,
      amount: dto.amount,
      description: dto.description,
      date: new Date(dto.date),
      category: dto.category,
    });
    return record;
  }

  async getExpenseRecords(query: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    type?: string;
    category?: string;
  }) {
    const { page = 1, limit = 20, startDate, endDate, type, category } = query;
    const filter: DynamicRecord = {};

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      filter.date = dateFilter;
    }
    if (type) filter.type = type;
    if (category) filter.category = category;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.expenseRecordModel
        .find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.expenseRecordModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async calculateBreakEven() {
    const [settings, products, revenueResult] = await Promise.all([
      this.financialSettingModel.find().exec(),
      this.productModel.find({ isActive: true, isArchived: false }).exec(),
      this.orderModel
        .aggregate<{ totalRevenue?: number; orderCount?: number }>([
          { $match: { orderStatus: 'delivered' } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$total' },
              orderCount: { $sum: 1 },
            },
          },
        ])
        .exec(),
    ]);

    const settingMap = new Map(settings.map((s) => [s.key, s.value]));
    const totalMonthlyFixedCosts = settings
      .filter((s) => s.type !== FinancialSettingType.TARGET_PROFIT)
      .reduce((sum, s) => sum + s.value, 0);
    const targetProfit = settingMap.get('target_profit') || 0;
    const revenueData = revenueResult[0];
    const currentRevenue = revenueData?.totalRevenue || 0;
    const orderCount = revenueData?.orderCount || 0;
    const averageOrderValue = orderCount > 0 ? currentRevenue / orderCount : 0;

    let totalContributionMargin = 0;
    let productCount = 0;

    for (const product of products) {
      const price = product.salePrice || product.regularPrice;
      const costPrice = product.costPrice || 0;
      totalContributionMargin += price - costPrice;
      productCount++;
    }

    const averageContributionMargin =
      productCount > 0 ? totalContributionMargin / productCount : 0;
    const averagePrice =
      productCount > 0
        ? products.reduce(
            (sum, p) => sum + (p.salePrice || p.regularPrice),
            0,
          ) / productCount
        : 0;
    const contributionMarginRatio =
      averagePrice > 0 ? averageContributionMargin / averagePrice : 0;

    const breakEvenRevenue =
      contributionMarginRatio > 0
        ? Math.round((totalMonthlyFixedCosts / contributionMarginRatio) * 100) /
          100
        : 0;
    const breakEvenOrderCount =
      averageOrderValue > 0
        ? Math.ceil(breakEvenRevenue / averageOrderValue)
        : 0;
    const progressPercent =
      breakEvenRevenue > 0
        ? Math.round((currentRevenue / breakEvenRevenue) * 10000) / 100
        : 0;
    const remainingRevenue = Math.max(0, breakEvenRevenue - currentRevenue);
    const targetRevenue = breakEvenRevenue + targetProfit;
    const targetOrdersRequired =
      averageOrderValue > 0 ? Math.ceil(targetRevenue / averageOrderValue) : 0;

    return {
      totalMonthlyFixedCosts,
      averageContributionMargin:
        Math.round(averageContributionMargin * 100) / 100,
      contributionMarginRatio:
        Math.round(contributionMarginRatio * 10000) / 100,
      breakEvenRevenue,
      breakEvenOrderCount,
      currentRevenue: Math.round(currentRevenue * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      progressPercent,
      remainingRevenue,
      targetProfit,
      targetRevenue,
      targetOrdersRequired,
    };
  }

  async getProfitabilityReport(startDate?: string, endDate?: string) {
    const match: DynamicRecord = { orderStatus: 'delivered' };
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      match.createdAt = dateFilter;
    }

    const [revenueResult, expenseResult] = await Promise.all([
      this.orderModel
        .aggregate<RevenueData>([
          { $match: match },
          {
            $group: {
              _id: null,
              grossSales: { $sum: '$total' },
              discounts: { $sum: '$discount' },
              deliveryFees: { $sum: '$deliveryFee' },
              items: { $push: '$items' },
            },
          },
        ])
        .exec(),
      this.expenseRecordModel.aggregate<{ total?: number }>([
        {
          $match:
            startDate || endDate
              ? {
                  date: {
                    ...(startDate ? { $gte: new Date(startDate) } : {}),
                    ...(endDate ? { $lte: new Date(endDate) } : {}),
                  },
                }
              : {},
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    interface RevenueData {
      grossSales: number;
      discounts: number;
      deliveryFees: number;
      items: Array<{ unitPrice: number; quantity: number }[]>;
    }
    const revenueData: RevenueData = revenueResult[0] || {
      grossSales: 0,
      discounts: 0,
      deliveryFees: 0,
      items: [],
    };

    const items: Array<{ unitPrice: number; quantity: number }> =
      revenueData.items.flat();
    const estimatedCOGS = items.reduce(
      (sum: number, item) => sum + item.unitPrice * 0.6 * item.quantity,
      0,
    );

    const grossSales = revenueData.grossSales;
    const discounts = revenueData.discounts;
    const netRevenue = Math.round((grossSales - discounts) * 100) / 100;
    const cogs = Math.round(estimatedCOGS * 100) / 100;
    const grossProfit = Math.round((netRevenue - cogs) * 100) / 100;
    const expenseData = expenseResult[0];
    const operatingExpenses = Math.round((expenseData?.total || 0) * 100) / 100;
    const operatingProfit =
      Math.round((grossProfit - operatingExpenses) * 100) / 100;

    return {
      grossSales,
      discounts,
      netRevenue,
      estimatedCOGS: cogs,
      grossProfit,
      grossMarginPercent:
        netRevenue > 0
          ? Math.round((grossProfit / netRevenue) * 10000) / 100
          : 0,
      operatingExpenses,
      operatingProfit,
      netProfitMarginPercent:
        netRevenue > 0
          ? Math.round((operatingProfit / netRevenue) * 10000) / 100
          : 0,
    };
  }
}
