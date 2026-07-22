import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Coupon, CouponDocument } from './schemas/coupon.schema';
import {
  CouponUsage,
  CouponUsageDocument,
} from './schemas/coupon-usage.schema';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { AudienceType, ELIGIBLE_ORDER_STATUSES } from './audience.constants';

function isAudienceType(value: string): value is AudienceType {
  return [
    'all',
    'new_customers',
    'returning',
    'high_value',
    'inactive',
    'specific',
  ].includes(value);
}

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
    @InjectModel(CouponUsage.name)
    private readonly couponUsageModel: Model<CouponUsageDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    search?: string;
  }) {
    const { page = 1, limit = 20, isActive, search } = query;
    const filter: DynamicRecord = {};

    if (isActive !== undefined) filter.isActive = isActive;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { code: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.couponModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.couponModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<CouponDocument> {
    const coupon = await this.couponModel.findById(id).exec();
    if (!coupon) {
      throw new NotFoundException(`Coupon with id "${id}" not found`);
    }
    return coupon;
  }

  async findByCode(code: string): Promise<CouponDocument> {
    const coupon = await this.couponModel
      .findOne({ code: code.toUpperCase() })
      .exec();
    if (!coupon) {
      throw new NotFoundException(`Coupon with code "${code}" not found`);
    }
    return coupon;
  }

  async create(dto: CreateCouponDto): Promise<CouponDocument> {
    const existing = await this.couponModel
      .findOne({ code: dto.code.toUpperCase() })
      .exec();
    if (existing) {
      throw new BadRequestException(
        `Coupon with code "${dto.code}" already exists`,
      );
    }

    if (dto.expirationDate <= dto.startDate) {
      throw new BadRequestException('Expiration date must be after start date');
    }

    this.validateAudienceConfig(dto.audience, dto);

    return this.couponModel.create({
      ...dto,
      code: dto.code.toUpperCase(),
    });
  }

  async update(id: string, dto: UpdateCouponDto): Promise<CouponDocument> {
    if (dto.code) {
      dto.code = dto.code.toUpperCase();
      const existing = await this.couponModel
        .findOne({ code: dto.code, _id: { $ne: id } })
        .exec();
      if (existing) {
        throw new BadRequestException(
          `Coupon with code "${dto.code}" already exists`,
        );
      }
    }

    if (
      dto.expirationDate &&
      dto.startDate &&
      dto.expirationDate <= dto.startDate
    ) {
      throw new BadRequestException('Expiration date must be after start date');
    }

    if (dto.expirationDate && !dto.startDate) {
      const current = await this.couponModel.findById(id).exec();
      if (current && dto.expirationDate <= current.startDate) {
        throw new BadRequestException(
          'Expiration date must be after start date',
        );
      }
    }

    if (dto.audience) {
      this.validateAudienceConfig(dto.audience, { ...dto });
    }

    const coupon = await this.couponModel
      .findByIdAndUpdate(id, { $set: dto }, { returnDocument: 'after' })
      .exec();
    if (!coupon) {
      throw new NotFoundException(`Coupon with id "${id}" not found`);
    }
    return coupon;
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const coupon = await this.couponModel.findByIdAndDelete(id).exec();
    if (!coupon) {
      throw new NotFoundException(`Coupon with id "${id}" not found`);
    }
    await this.couponUsageModel.deleteMany({ coupon: id }).exec();
    return { deleted: true };
  }

  async validateCoupon(
    code: string,
    subtotal: number,
    items?: { productId: string; categoryId?: string }[],
    email?: string,
    authenticatedUserId?: string,
  ): Promise<{ coupon: CouponDocument; discount: number }> {
    const coupon = await this.couponModel
      .findOne({ code: code.toUpperCase() })
      .exec();

    if (!coupon) {
      throw new BadRequestException('Invalid coupon code');
    }

    if (!coupon.isActive) {
      throw new BadRequestException('This coupon is no longer active');
    }

    const now = new Date();
    if (now < coupon.startDate) {
      throw new BadRequestException('This coupon is not yet valid');
    }

    if (now > coupon.expirationDate) {
      throw new BadRequestException('This coupon has expired');
    }

    if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
      throw new BadRequestException(
        `Minimum order value of ${coupon.minOrderValue} is required for this coupon`,
      );
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }

    const resolvedEmail = await this.resolveIdentity(
      authenticatedUserId,
      email,
    );

    if (resolvedEmail) {
      const usageCount = await this.couponUsageModel
        .countDocuments({ coupon: coupon._id.toString(), email: resolvedEmail })
        .exec();
      if (usageCount >= coupon.perCustomerLimit) {
        throw new BadRequestException(
          'You have reached the usage limit for this coupon',
        );
      }
    }

    if (
      items &&
      items.length > 0 &&
      (coupon.applicableProducts.length > 0 ||
        coupon.applicableCategories.length > 0)
    ) {
      const hasApplicable = items.some(
        (item) =>
          coupon.applicableProducts.includes(item.productId) ||
          (item.categoryId &&
            coupon.applicableCategories.includes(item.categoryId)),
      );
      if (!hasApplicable) {
        throw new BadRequestException(
          'This coupon does not apply to the items in your cart',
        );
      }
    }

    await this.validateAudience(coupon, resolvedEmail);

    const discount = this.calculateDiscount(coupon, subtotal);

    return { coupon, discount };
  }

  private async resolveIdentity(
    authenticatedUserId?: string,
    requestEmail?: string,
  ): Promise<string | null> {
    if (authenticatedUserId) {
      const user = await this.userModel
        .findById(authenticatedUserId)
        .select('email')
        .exec();
      if (user?.email) {
        return user.email.toLowerCase();
      }
    }

    if (requestEmail) {
      return requestEmail.toLowerCase();
    }

    return null;
  }

  private validateAudienceConfig(
    audience: string | undefined,
    dto: Partial<CreateCouponDto>,
  ): void {
    if (!audience || audience === 'all') return;

    if (
      audience === 'specific' &&
      (!dto.customerEmails || dto.customerEmails.length === 0)
    ) {
      throw new BadRequestException(
        'Audience "specific" requires at least one customer email',
      );
    }

    if (audience === 'high_value' && !dto.minSpent && !dto.minOrders) {
      throw new BadRequestException(
        'Audience "high_value" requires minSpent and/or minOrders',
      );
    }

    if (audience === 'inactive' && !dto.inactiveDays) {
      throw new BadRequestException(
        'Audience "inactive" requires inactiveDays',
      );
    }
  }

  private async validateAudience(
    coupon: CouponDocument,
    resolvedEmail: string | null,
  ): Promise<void> {
    if (!coupon.audience || coupon.audience === 'all') return;

    if (!resolvedEmail) {
      throw new BadRequestException('You must be logged in to use this coupon');
    }

    if (!isAudienceType(coupon.audience)) {
      throw new BadRequestException('Coupon audience configuration is invalid');
    }
    const audience = coupon.audience;

    if (audience === 'specific') {
      const matched = (coupon.customerEmails || []).some(
        (e) => e.toLowerCase() === resolvedEmail,
      );
      if (!matched) {
        throw new BadRequestException(
          'This coupon is not available for your account',
        );
      }
      return;
    }

    const user = await this.userModel.findOne({ email: resolvedEmail }).exec();

    if (!user) {
      if (audience === 'new_customers') {
        return;
      }
      throw new BadRequestException(
        'This coupon is not available for guest customers',
      );
    }

    const userId = user._id.toString();

    interface TotalSpentResult {
      _id: null;
      total: number;
    }

    const [qualifiedCount, totalSpentResult] = await Promise.all([
      this.orderModel.countDocuments({
        user: userId,
        orderStatus: { $in: ELIGIBLE_ORDER_STATUSES },
      }),
      this.orderModel.aggregate<TotalSpentResult>([
        {
          $match: {
            user: new Types.ObjectId(userId),
            orderStatus: { $in: ELIGIBLE_ORDER_STATUSES },
          },
        },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    const totalSpent = totalSpentResult[0]?.total ?? 0;

    if (audience === 'new_customers') {
      if (qualifiedCount > 0) {
        throw new BadRequestException('This coupon is for new customers only');
      }
      return;
    }

    if (audience === 'returning') {
      if (qualifiedCount === 0) {
        throw new BadRequestException(
          'This coupon is for returning customers only',
        );
      }
      return;
    }

    if (audience === 'high_value') {
      if (qualifiedCount === 0) {
        throw new BadRequestException(
          'This coupon is for high-value customers only',
        );
      }
      if (coupon.minSpent && totalSpent < coupon.minSpent) {
        throw new BadRequestException(
          `Minimum total spend of ${coupon.minSpent} is required for this coupon`,
        );
      }
      if (coupon.minOrders && qualifiedCount < coupon.minOrders) {
        throw new BadRequestException(
          `Minimum ${coupon.minOrders} qualified orders required for this coupon`,
        );
      }
      return;
    }

    if (audience === 'inactive') {
      if (qualifiedCount === 0) {
        throw new BadRequestException(
          'This coupon is for existing customers only',
        );
      }
      const lastOrder = await this.orderModel
        .findOne({
          user: userId,
          orderStatus: { $in: ELIGIBLE_ORDER_STATUSES },
        })
        .sort({ createdAt: -1 })
        .exec();
      if (lastOrder && coupon.inactiveDays) {
        const daysSince = Math.floor(
          (Date.now() - lastOrder.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysSince < coupon.inactiveDays) {
          throw new BadRequestException(
            `This coupon is for customers inactive for ${coupon.inactiveDays}+ days`,
          );
        }
      }
      return;
    }
  }

  calculateDiscount(coupon: CouponDocument, subtotal: number): number {
    let discount = 0;

    if (coupon.type === 'percentage') {
      discount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else {
      discount = coupon.value;
    }

    return Math.min(discount, subtotal);
  }

  async recordUsage(
    couponId: string,
    orderId: string,
    userId?: string,
    email?: string,
    discountAmount?: number,
  ): Promise<void> {
    await this.couponModel
      .findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } })
      .exec();

    const record = new this.couponUsageModel({
      coupon: couponId,
      order: orderId,
      user: userId,
      email,
      discountAmount: discountAmount || 0,
    });
    await record.save();
  }

  async getUsageRecords(couponId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.couponUsageModel
        .find({ coupon: couponId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('order')
        .exec(),
      this.couponUsageModel.countDocuments({ coupon: couponId }),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
