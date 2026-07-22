import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(dto: {
    recipient?: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: DynamicRecord;
  }) {
    const notification = await this.notificationModel.create({
      recipient: dto.recipient ?? undefined,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data || {},
      isRead: false,
    });

    return notification;
  }

  async findByUser(
    userId: string,
    query: { page?: number; limit?: number; unreadOnly?: boolean } = {},
  ) {
    const { page = 1, limit = 20, unreadOnly = false } = query;

    const filter: DynamicRecord = { recipient: userId };
    if (unreadOnly) filter.isRead = false;

    const skip = (page - 1) * limit;

    const [items, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(filter),
      this.notificationModel.countDocuments({
        recipient: userId,
        isRead: false,
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.notificationModel.findById(notificationId);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.recipient?.toString() !== userId) {
      throw new ForbiddenException(
        'You can only mark your own notifications as read',
      );
    }

    notification.isRead = true;
    notification.readAt = new Date();
    return notification.save();
  }

  async markAllAsRead(userId: string) {
    await this.notificationModel.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );

    return { success: true };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationModel.countDocuments({
      recipient: userId,
      isRead: false,
    });

    return { count };
  }

  async delete(notificationId: string, userId: string) {
    const notification = await this.notificationModel.findById(notificationId);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.recipient?.toString() !== userId) {
      throw new ForbiddenException(
        'You can only delete your own notifications',
      );
    }

    await this.notificationModel.findByIdAndDelete(notificationId);
    return { deleted: true };
  }

  async sendOrderConfirmation(
    userId: string | undefined,
    email: string,
    order: { orderNumber?: string; total?: number },
  ) {
    return this.create({
      recipient: userId,
      type: NotificationType.ORDER_CONFIRMATION,
      title: 'Order Confirmed',
      message: `Your order #${order.orderNumber || 'N/A'} has been confirmed for E£${order.total || 0}.`,
      data: { orderNumber: order.orderNumber, total: order.total },
    });
  }

  async sendLowStockAlert(product: {
    name?: string;
    sku?: string;
    stock?: number;
  }) {
    return this.create({
      type: NotificationType.LOW_STOCK,
      title: 'Low Stock Alert',
      message: `Product "${product.name || product.sku}" is low on stock (${product.stock || 0} remaining).`,
      data: { product: product.name, sku: product.sku, stock: product.stock },
    });
  }
}
