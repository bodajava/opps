import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { SortOrder } from '../common/dto/pagination.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  async findAll(query: QueryCustomersDto) {
    const {
      page = 1,
      limit = 20,
      search,
      isBlocked,
      sortBy,
      order: sortOrder = 'desc',
    } = query;

    const filter: DynamicRecord = {};

    if (isBlocked !== undefined) {
      filter.isBlocked = isBlocked;
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { fullName: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ];
    }

    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
    if (sortBy) {
      const orderVal = sortOrder === SortOrder.ASC ? 1 : -1;
      sortObj = { [sortBy]: orderVal };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select(
          '-password -refreshToken -resetPasswordToken -resetPasswordExpires',
        )
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter),
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

  async findById(id: string) {
    const user = await this.userModel
      .findById(id)
      .select(
        '-password -refreshToken -resetPasswordToken -resetPasswordExpires',
      )
      .exec();

    if (!user) {
      throw new NotFoundException(`Customer with id "${id}" not found`);
    }

    const orders = await this.orderModel
      .find({ user: id })
      .sort({ createdAt: -1 })
      .exec();

    return { customer: user, recentOrders: orders };
  }

  async findByEmail(email: string) {
    const user = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .select(
        '-password -refreshToken -resetPasswordToken -resetPasswordExpires',
      )
      .exec();

    if (!user) {
      throw new NotFoundException(`Customer with email "${email}" not found`);
    }

    return user;
  }

  async getGuestCustomers(query: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const { page = 1, limit = 20, search } = query;

    const match: DynamicRecord = { isGuest: true };
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.$or = [
        { customerEmail: { $regex: escaped, $options: 'i' } },
        { customerName: { $regex: escaped, $options: 'i' } },
      ];
    }

    const result = await this.orderModel
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: '$customerEmail',
            customerName: { $first: '$customerName' },
            customerPhone: { $first: '$customerPhone' },
            orderCount: { $sum: 1 },
            totalSpent: { $sum: '$total' },
            lastOrderDate: { $max: '$createdAt' },
            firstOrderDate: { $min: '$createdAt' },
          },
        },
        { $sort: { lastOrderDate: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            email: '$_id',
            customerName: 1,
            customerPhone: 1,
            orderCount: 1,
            totalSpent: { $round: ['$totalSpent', 2] },
            lastOrderDate: 1,
            firstOrderDate: 1,
          },
        },
      ])
      .exec();

    const totalResult = await this.orderModel
      .aggregate<{ total?: number }>([
        { $match: match },
        { $group: { _id: '$customerEmail' } },
        { $count: 'total' },
      ])
      .exec();

    const total = totalResult[0]?.total || 0;

    return {
      items: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCustomerStats(id: string) {
    const user = await this.userModel
      .findById(id)
      .select('-password -refreshToken')
      .exec();
    if (!user) throw new NotFoundException('Customer not found');

    const [orderCountResult, orderStats] = await Promise.all([
      this.orderModel.countDocuments({ user: id }),
      this.orderModel
        .aggregate<OrderStats>([
          { $match: { user: id } },
          {
            $group: {
              _id: null,
              totalSpent: { $sum: '$total' },
              lastOrderDate: { $max: '$createdAt' },
              averageOrderValue: { $avg: '$total' },
            },
          },
        ])
        .exec(),
    ]);

    interface OrderStats {
      totalSpent: number;
      lastOrderDate: Date | null;
      averageOrderValue: number;
    }
    const stats: OrderStats = orderStats[0] || {
      totalSpent: 0,
      lastOrderDate: null,
      averageOrderValue: 0,
    };

    return {
      customerId: id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
      orderCount: orderCountResult,
      totalSpent: Math.round(stats.totalSpent * 100) / 100,
      lastOrderDate: stats.lastOrderDate,
      averageOrderValue: Math.round(stats.averageOrderValue * 100) / 100,
    };
  }

  async blockCustomer(id: string) {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { $set: { isBlocked: true } },
      { returnDocument: 'after' },
    );
    if (!user) throw new NotFoundException('Customer not found');
    return user;
  }

  async unblockCustomer(id: string) {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { $set: { isBlocked: false } },
      { returnDocument: 'after' },
    );
    if (!user) throw new NotFoundException('Customer not found');
    return user;
  }
}
