import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Coupon, CouponDocument } from '../coupons/schemas/coupon.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

interface RevenueAggregation {
  totalRevenue: number;
  totalDiscount: number;
  totalCostEstimate: number;
  onlineTotal: number;
  codTotal: number;
  deliveredCount: number;
}

interface OrdersByStatusItem {
  _id: string;
  count: number;
}

export interface NewVsReturningItem {
  _id: string;
  orderCount: number;
  firstOrder: Date;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async getOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      revenueResult,
      orderCounts,
      productCounts,
      activeCouponsCount,
      newCustomersCount,
      guestOrdersCount,
    ] = await Promise.all([
      this.orderModel
        .aggregate<RevenueAggregation>([
          { $match: { orderStatus: 'delivered' } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$total' },
              totalDiscount: { $sum: '$discount' },
              totalCostEstimate: {
                $sum: {
                  $reduce: {
                    input: '$items',
                    initialValue: 0,
                    in: {
                      $add: [
                        '$$value',
                        { $multiply: ['$$this.unitPrice', '$$this.quantity'] },
                      ],
                    },
                  },
                },
              },
              onlineTotal: {
                $sum: {
                  $cond: [
                    { $ne: ['$paymentMethod', 'cash_on_delivery'] },
                    '$total',
                    0,
                  ],
                },
              },
              codTotal: {
                $sum: {
                  $cond: [
                    { $eq: ['$paymentMethod', 'cash_on_delivery'] },
                    '$total',
                    0,
                  ],
                },
              },
              deliveredCount: { $sum: 1 },
            },
          },
        ])
        .exec(),
      Promise.all([
        this.orderModel.countDocuments(),
        this.orderModel.countDocuments({ orderStatus: 'pending' }),
        this.orderModel.countDocuments({ orderStatus: 'confirmed' }),
        this.orderModel.countDocuments({ orderStatus: 'delivered' }),
        this.orderModel.countDocuments({ orderStatus: 'cancelled' }),
      ]),
      Promise.all([
        this.productModel.countDocuments(),
        this.productModel.countDocuments({
          $expr: {
            $and: [
              { $gt: ['$stock', 0] },
              { $lte: ['$stock', '$lowStockThreshold'] },
            ],
          },
        }),
        this.productModel.countDocuments({ stock: { $lte: 0 } }),
      ]),
      this.couponModel.countDocuments({
        isActive: true,
        startDate: { $lte: now },
        expirationDate: { $gte: now },
      }),
      this.userModel.countDocuments({
        createdAt: { $gte: startOfMonth },
        isBlocked: false,
      }),
      this.orderModel.countDocuments({ isGuest: true }),
    ]);

    const revenue: RevenueAggregation = revenueResult[0] || {
      totalRevenue: 0,
      totalDiscount: 0,
      totalCostEstimate: 0,
      onlineTotal: 0,
      codTotal: 0,
      deliveredCount: 0,
    };

    const netSales = revenue.totalRevenue - revenue.totalDiscount;
    const grossProfitEstimate =
      revenue.totalRevenue - revenue.totalCostEstimate;
    const averageOrderValue =
      revenue.deliveredCount > 0
        ? Math.round((revenue.totalRevenue / revenue.deliveredCount) * 100) /
          100
        : 0;

    return {
      totalRevenue: Math.round(revenue.totalRevenue * 100) / 100,
      netSales: Math.round(netSales * 100) / 100,
      grossProfitEstimate: Math.round(grossProfitEstimate * 100) / 100,
      totalOrders: orderCounts[0],
      pendingOrders: orderCounts[1],
      confirmedOrders: orderCounts[2],
      deliveredOrders: orderCounts[3],
      cancelledOrders: orderCounts[4],
      averageOrderValue,
      totalProducts: productCounts[0],
      lowStockProducts: productCounts[1],
      outOfStockProducts: productCounts[2],
      activeCoupons: activeCouponsCount,
      newCustomers: newCustomersCount,
      guestOrders: guestOrdersCount,
      onlinePaymentTotal: Math.round(revenue.onlineTotal * 100) / 100,
      cashOnDeliveryTotal: Math.round(revenue.codTotal * 100) / 100,
    };
  }

  async getSalesData(
    period: 'day' | 'week' | 'month',
    startDate?: string,
    endDate?: string,
  ) {
    const match: DynamicRecord = { orderStatus: 'delivered' };
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      match.createdAt = dateFilter;
    }

    let dateFormat;
    if (period === 'day') {
      dateFormat = {
        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
      };
    } else if (period === 'week') {
      dateFormat = { $dateToString: { format: '%G-W%V', date: '$createdAt' } };
    } else {
      dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    }

    return this.orderModel
      .aggregate<{
        period: string;
        sales: number;
        orders: number;
        discounts: number;
      }>([
        { $match: match },
        {
          $group: {
            _id: dateFormat,
            sales: { $sum: '$total' },
            orders: { $sum: 1 },
            discounts: { $sum: '$discount' },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            period: '$_id',
            sales: { $round: ['$sales', 2] },
            orders: 1,
            discounts: { $round: ['$discounts', 2] },
          },
        },
      ])
      .exec();
  }

  async getOrdersByStatus() {
    const result = await this.orderModel
      .aggregate<OrdersByStatusItem>([
        {
          $group: {
            _id: '$orderStatus',
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    const total = result.reduce(
      (sum: number, r: OrdersByStatusItem) => sum + r.count,
      0,
    );
    return {
      items: result.map((r: OrdersByStatusItem) => ({
        status: r._id,
        count: r.count,
      })),
      total,
    };
  }

  async getRevenueByPaymentMethod() {
    return this.orderModel
      .aggregate<NewVsReturningItem>([
        { $match: { orderStatus: 'delivered' } },
        {
          $group: {
            _id: '$paymentMethod',
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
        {
          $project: {
            _id: 0,
            paymentMethod: '$_id',
            revenue: { $round: ['$revenue', 2] },
            orders: 1,
          },
        },
      ])
      .exec();
  }

  async getBestSellingProducts(limit = 10) {
    return this.orderModel
      .aggregate([
        { $match: { orderStatus: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            quantitySold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.totalPrice' },
          },
        },
        { $sort: { quantitySold: -1 } },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            productId: '$_id',
            name: 1,
            quantitySold: 1,
            revenue: { $round: ['$revenue', 2] },
          },
        },
      ])
      .exec();
  }

  async getSalesByGovernorate() {
    return this.orderModel
      .aggregate([
        { $match: { orderStatus: 'delivered' } },
        {
          $group: {
            _id: '$shippingAddress.state',
            sales: { $sum: '$total' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { sales: -1 } },
        {
          $project: {
            _id: 0,
            governorate: '$_id',
            sales: { $round: ['$sales', 2] },
            orders: 1,
          },
        },
      ])
      .exec();
  }

  async getCouponUsage() {
    return this.orderModel
      .aggregate([
        { $match: { couponCode: { $exists: true, $ne: '' } } },
        {
          $group: {
            _id: '$couponCode',
            usageCount: { $sum: 1 },
            totalDiscount: { $sum: '$discount' },
            totalRevenue: { $sum: '$total' },
          },
        },
        { $sort: { usageCount: -1 } },
        {
          $project: {
            _id: 0,
            couponCode: '$_id',
            usageCount: 1,
            totalDiscount: { $round: ['$totalDiscount', 2] },
            totalRevenue: { $round: ['$totalRevenue', 2] },
          },
        },
      ])
      .exec();
  }

  async getNewVsReturningCustomers() {
    const allOrders = await this.orderModel
      .aggregate<NewVsReturningItem>([
        { $match: { user: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$user',
            orderCount: { $sum: 1 },
            firstOrder: { $min: '$createdAt' },
          },
        },
      ])
      .exec();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let newCustomers = 0;
    let returningCustomers = 0;

    for (const customer of allOrders) {
      if (customer.firstOrder >= thirtyDaysAgo) {
        newCustomers++;
      } else {
        returningCustomers++;
      }
    }

    const guestOrders = await this.orderModel.countDocuments({ isGuest: true });

    return {
      newCustomers,
      returningCustomers,
      guestOrders,
      totalUnique: allOrders.length,
    };
  }

  async getProductPerformance(startDate?: string, endDate?: string) {
    const match: DynamicRecord = {
      orderStatus: { $ne: 'cancelled' },
    };
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      match.createdAt = dateFilter;
    }

    return this.orderModel
      .aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            quantitySold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.totalPrice' },
            orders: { $addToSet: '$_id' },
          },
        },
        {
          $project: {
            _id: 0,
            productId: '$_id',
            name: 1,
            quantitySold: 1,
            revenue: { $round: ['$revenue', 2] },
            orderCount: { $size: '$orders' },
          },
        },
        { $sort: { revenue: -1 } },
      ])
      .exec();
  }
}
