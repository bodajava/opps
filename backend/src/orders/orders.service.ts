import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import {
  InventoryMovement,
  InventoryMovementDocument,
  InventoryMovementType,
} from '../inventory/schemas/inventory-movement.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import {
  ProductVariant,
  ProductVariantDocument,
} from '../product-variants/schemas/product-variant.schema';
import { OrderNumberHelper } from '../common/helpers/order-number.helper';
import { EmailService } from '../common/providers/email.service';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { SortOrder } from '../common/dto/pagination.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  private readonly orderStatuses: readonly string[] = [
    'pending',
    'confirmed',
    'processing',
    'ready_for_delivery',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'returned',
    'refunded',
  ];

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(InventoryMovement.name)
    private readonly inventoryMovementModel: Model<InventoryMovementDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(ProductVariant.name)
    private readonly variantModel: Model<ProductVariantDocument>,
    private readonly orderNumberHelper: OrderNumberHelper,
    private readonly emailService: EmailService,
  ) {}

  async findAll(query: QueryOrdersDto) {
    const {
      page = 1,
      limit = 20,
      sort,
      order,
      status,
      paymentStatus,
      paymentMethod,
      search,
      dateFrom,
      dateTo,
    } = query;

    const filter: DynamicRecord = {};

    if (status) filter.orderStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.$lte = new Date(dateTo);
      filter.createdAt = dateFilter;
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { orderNumber: { $regex: escaped, $options: 'i' } },
        { customerName: { $regex: escaped, $options: 'i' } },
        { customerEmail: { $regex: escaped, $options: 'i' } },
        { customerPhone: { $regex: escaped, $options: 'i' } },
      ];
    }

    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort) {
      const orderVal = order === SortOrder.ASC ? 1 : -1;
      sortObj = { [sort]: orderVal };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.orderModel.find(filter).sort(sortObj).skip(skip).limit(limit).exec(),
      this.orderModel.countDocuments(filter),
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

  async findByOrderNumber(orderNumber: string): Promise<OrderDocument> {
    const order = await this.orderModel.findOne({ orderNumber }).exec();
    if (!order) {
      throw new NotFoundException(`Order "${orderNumber}" not found`);
    }
    return order;
  }

  async trackByOrderNumber(
    orderNumber: string,
    email: string,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findOne({ orderNumber }).exec();
    if (!order) {
      throw new NotFoundException(`Order "${orderNumber}" not found`);
    }
    if (order.customerEmail !== email.toLowerCase().trim()) {
      throw new NotFoundException(`Order "${orderNumber}" not found`);
    }
    return order;
  }

  async findById(id: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException(`Order with id "${id}" not found`);
    }
    return order;
  }

  async findByEmail(email: string): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ customerEmail: email })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByIdempotencyKey(key: string): Promise<OrderDocument | null> {
    return this.orderModel.findOne({ idempotencyKey: key }).exec();
  }

  async create(
    data: {
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      secondaryPhone?: string;
      shippingAddress: DynamicRecord;
      items: Array<DynamicRecord>;
      subtotal: number;
      discount: number;
      deliveryFee: number;
      total: number;
      couponCode?: string;
      paymentMethod: string;
      customerNotes?: string;
      userId?: string;
      idempotencyKey?: string;
    },
    session?: ClientSession,
  ): Promise<OrderDocument> {
    const orderNumber = await this.orderNumberHelper.generateOrderNumber();

    const order = new this.orderModel({
      orderNumber,
      ...(data.userId ? { user: data.userId } : {}),
      ...(data.idempotencyKey ? { idempotencyKey: data.idempotencyKey } : {}),
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerName: data.customerName,
      shippingAddress: data.shippingAddress,
      items: data.items,
      subtotal: data.subtotal,
      discount: data.discount,
      deliveryFee: data.deliveryFee,
      total: data.total,
      couponCode: data.couponCode,
      paymentMethod: data.paymentMethod,
      customerNotes: data.customerNotes,
      isGuest: !data.userId,
      orderStatus: 'pending',
      paymentStatus: 'unpaid',
      statusHistory: [
        {
          newStatus: 'pending',
          changedBy: 'system',
          changedAt: new Date(),
          note: 'Order created',
        },
      ],
    });
    await order.save({ session });

    return order;
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    changedBy: string,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException(`Order with id "${id}" not found`);
    }

    const validStatuses: string[] = [...this.orderStatuses];
    if (!validStatuses.includes(dto.status)) {
      throw new BadRequestException(`Invalid status: "${dto.status}"`);
    }

    const previousStatus = order.orderStatus;

    order.statusHistory.push({
      previousStatus,
      newStatus: dto.status,
      changedBy,
      changedAt: new Date(),
      note: dto.note || '',
    });

    order.orderStatus = dto.status;

    if (dto.status === 'delivered') {
      order.deliveredAt = new Date();
    }

    if (dto.status === 'cancelled') {
      order.cancelledAt = new Date();
    }

    if (dto.status === 'cancelled' && dto.note) {
      order.cancellationReason = dto.note;
    }

    await order.save();

    try {
      await this.emailService.sendOrderStatusUpdate(
        order.customerEmail,
        { orderNumber: order.orderNumber },
        dto.status,
      );
    } catch (err) {
      this.logger.warn('Failed to send status update email', err);
    }

    return order;
  }

  async cancelOrder(
    id: string,
    reason: string,
    changedBy: string,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException(`Order with id "${id}" not found`);
    }

    if (
      ['delivered', 'cancelled', 'returned', 'refunded'].includes(
        order.orderStatus,
      )
    ) {
      throw new BadRequestException(
        `Order cannot be cancelled in current status: "${order.orderStatus}"`,
      );
    }

    const previousStatus = order.orderStatus;

    order.statusHistory.push({
      previousStatus,
      newStatus: 'cancelled',
      changedBy,
      changedAt: new Date(),
      note: reason,
    });

    order.orderStatus = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = reason;

    await order.save();

    await this.restoreStock(order);

    try {
      await this.emailService.sendOrderStatusUpdate(
        order.customerEmail,
        { orderNumber: order.orderNumber },
        'cancelled',
      );
    } catch (err) {
      this.logger.warn('Failed to send cancellation email', err);
    }

    return order;
  }

  private async restoreStock(order: OrderDocument): Promise<void> {
    for (const item of order.items) {
      if (item.variant) {
        const variant = await this.variantModel.findById(item.variant).exec();
        if (variant) {
          const prevStock = variant.stock;
          variant.stock += item.quantity;
          await variant.save();

          await this.inventoryMovementModel.create({
            product: item.product,
            variant: item.variant,
            type: InventoryMovementType.CANCELLATION,
            quantity: item.quantity,
            previousStock: prevStock,
            newStock: variant.stock,
            reference: `order-cancel-${order.orderNumber}`,
            reason: `Order cancelled: ${order.cancellationReason}`,
          });
        }
      } else {
        const product = await this.productModel.findById(item.product).exec();
        if (product) {
          const prevStock = product.stock;
          product.stock += item.quantity;
          const inStock = product.stock > 0;
          const threshold = product.lowStockThreshold;
          const status =
            product.stock <= 0
              ? 'out_of_stock'
              : product.stock <= threshold
                ? 'low_stock'
                : 'in_stock';
          product.inStock = inStock;
          product.status = status;
          await product.save();

          await this.inventoryMovementModel.create({
            product: item.product,
            type: InventoryMovementType.CANCELLATION,
            quantity: item.quantity,
            previousStock: prevStock,
            newStock: product.stock,
            reference: `order-cancel-${order.orderNumber}`,
            reason: `Order cancelled: ${order.cancellationReason}`,
          });
        }
      }
    }
  }

  async getOrderStats(): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    processing: number;
    readyForDelivery: number;
    outForDelivery: number;
    delivered: number;
    cancelled: number;
    returned: number;
    today: number;
    revenue: number;
  }> {
    const [
      total,
      pending,
      confirmed,
      processing,
      readyForDelivery,
      outForDelivery,
      delivered,
      cancelled,
      returned,
      todayOrders,
      revenueResult,
    ] = await Promise.all([
      this.orderModel.countDocuments(),
      this.orderModel.countDocuments({ orderStatus: 'pending' }),
      this.orderModel.countDocuments({ orderStatus: 'confirmed' }),
      this.orderModel.countDocuments({ orderStatus: 'processing' }),
      this.orderModel.countDocuments({ orderStatus: 'ready_for_delivery' }),
      this.orderModel.countDocuments({ orderStatus: 'out_for_delivery' }),
      this.orderModel.countDocuments({ orderStatus: 'delivered' }),
      this.orderModel.countDocuments({ orderStatus: 'cancelled' }),
      this.orderModel.countDocuments({ orderStatus: 'returned' }),
      this.orderModel.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      this.orderModel
        .aggregate<{ totalRevenue?: number }>([
          { $match: { orderStatus: 'delivered' } },
          { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
        ])
        .exec(),
    ]);

    return {
      total,
      pending,
      confirmed,
      processing,
      readyForDelivery,
      outForDelivery,
      delivered,
      cancelled,
      returned,
      today: todayOrders,
      revenue: revenueResult[0]?.totalRevenue ?? 0,
    };
  }
}
