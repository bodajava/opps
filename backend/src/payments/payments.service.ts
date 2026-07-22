import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import {
  PaymentEvent,
  PaymentEventDocument,
} from './schemas/payment-event.schema';
import { PaymentRegistryService } from './payment-registry.service';
import { OrdersService } from '../orders/orders.service';
import { toDynamicRecord } from '../common/helpers/dynamic-value.helper';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(PaymentEvent.name)
    private readonly paymentEventModel: Model<PaymentEventDocument>,
    private readonly paymentRegistry: PaymentRegistryService,
    private readonly ordersService: OrdersService,
  ) {}

  private generateStatusToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }

  async createPaymentSession(
    orderId: string,
    paymentMethod: string,
    userId?: string,
  ) {
    const order = await this.ordersService.findById(orderId);

    if (order.orderStatus === 'cancelled' || order.orderStatus === 'returned') {
      throw new ForbiddenException(
        'Cannot create payment for a cancelled or returned order',
      );
    }

    if (order.paymentStatus === 'paid') {
      throw new ForbiddenException('Order is already paid');
    }

    if (userId) {
      const orderUserId = order.user ? String(order.user) : '';
      if (orderUserId && orderUserId !== userId) {
        throw new ForbiddenException('Order does not belong to you');
      }
    }

    const provider = this.paymentRegistry.getProvider(paymentMethod);

    const session = await provider.createPayment(order);

    const existing = await this.paymentModel.findOne({ order: orderId }).exec();
    if (existing) {
      existing.reference = session.reference;
      existing.providerReference = session.id;
      existing.providerResponse = session.metadata || {};
      existing.paymentMethod = paymentMethod;
      existing.amount = order.total;
      await existing.save();
      await this.logPaymentEvent(
        existing._id.toString(),
        'session_created',
        paymentMethod,
        session,
      );
      return existing;
    }

    const { token, hash } = this.generateStatusToken();
    const payment = new this.paymentModel({
      order: order._id,
      orderNumber: order.orderNumber,
      paymentMethod,
      amount: order.total,
      currency: 'EGP',
      status: 'pending',
      reference: session.reference,
      providerReference: session.id,
      providerResponse: session.metadata || {},
      statusTokenHash: userId ? undefined : hash,
    });
    await payment.save();

    await this.logPaymentEvent(
      payment._id.toString(),
      'session_created',
      paymentMethod,
      session,
    );

    const result = payment.toObject();
    return userId ? result : { ...result, statusToken: token };
  }

  async getPaymentStatusByReference(reference: string, userId?: string) {
    const payment = await this.paymentModel.findOne({ reference }).exec();
    if (!payment) {
      throw new NotFoundException(
        `Payment with reference "${reference}" not found`,
      );
    }

    if (userId) {
      const order = await this.ordersService.findById(payment.order.toString());
      const orderUserId = order.user ? String(order.user) : '';
      if (orderUserId && orderUserId !== userId) {
        throw new ForbiddenException('Payment does not belong to you');
      }
    }

    return {
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      orderNumber: payment.orderNumber,
      paidAt: payment.paidAt,
    };
  }

  async getGuestPaymentStatus(reference: string, statusToken: string) {
    if (!statusToken) {
      throw new ForbiddenException('Status token is required');
    }

    const payment = await this.paymentModel.findOne({ reference }).exec();
    if (!payment) {
      throw new NotFoundException(
        `Payment with reference "${reference}" not found`,
      );
    }

    if (!payment.statusTokenHash) {
      throw new ForbiddenException('This payment requires authentication');
    }

    const hash = crypto.createHash('sha256').update(statusToken).digest('hex');
    if (hash.length !== payment.statusTokenHash.length) {
      throw new ForbiddenException('Invalid status token');
    }
    if (
      !crypto.timingSafeEqual(
        Buffer.from(hash),
        Buffer.from(payment.statusTokenHash),
      )
    ) {
      throw new ForbiddenException('Invalid status token');
    }

    return {
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paidAt: payment.paidAt,
    };
  }

  async verifyPayment(reference: string, providerName?: string) {
    const payment = await this.paymentModel.findOne({ reference }).exec();
    if (!payment) {
      throw new NotFoundException(
        `Payment with reference "${reference}" not found`,
      );
    }

    if (payment.status === 'paid') {
      return { payment, verification: { verified: true, status: 'paid' } };
    }

    const provider = providerName
      ? this.paymentRegistry.getProvider(providerName)
      : this.paymentRegistry.getProvider(payment.paymentMethod);

    const result = await provider.verifyPayment(reference);

    if (result.verified && result.status === 'paid') {
      payment.status = 'paid';
      payment.paidAt = new Date();
      await payment.save();

      const order = await this.ordersService.findById(payment.order.toString());
      order.paymentStatus = 'paid';
      await order.save();
    }

    await this.logPaymentEvent(
      payment._id.toString(),
      'payment_verified',
      payment.paymentMethod,
      result,
    );
    return { payment, verification: result };
  }

  async handleWebhook(
    providerName: string,
    payload: DynamicRecord,
    signature?: string,
  ) {
    const provider = this.paymentRegistry.getProvider(providerName);
    await provider.handleWebhook(payload, signature);
  }

  async processRefund(paymentId: string, amount?: number) {
    const payment = await this.paymentModel.findById(paymentId).exec();
    if (!payment) {
      throw new NotFoundException(`Payment with id "${paymentId}" not found`);
    }

    const provider = this.paymentRegistry.getProvider(payment.paymentMethod);
    if (!provider.refundPayment) {
      throw new Error(
        `Provider ${payment.paymentMethod} does not support refunds`,
      );
    }
    const result = await provider.refundPayment(paymentId, amount);

    if (result.success) {
      if (amount && amount < payment.amount) {
        payment.status = 'partially_refunded';
      } else {
        payment.status = 'refunded';
      }
      payment.providerResponse = {
        ...payment.providerResponse,
        refund: result,
      };

      const order = await this.ordersService.findById(payment.order.toString());
      order.paymentStatus = payment.status;
      await order.save();

      await payment.save();
    }

    await this.logPaymentEvent(
      payment._id.toString(),
      'refund_processed',
      payment.paymentMethod,
      result,
    );
    return { payment, refund: result };
  }

  async markAsPaid(paymentId: string, adminId: string) {
    const payment = await this.paymentModel.findById(paymentId).exec();
    if (!payment) {
      throw new NotFoundException(`Payment with id "${paymentId}" not found`);
    }

    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.notes = `Marked as paid by admin: ${adminId}`;
    await payment.save();

    const order = await this.ordersService.findById(payment.order.toString());
    order.paymentStatus = 'paid';
    await order.save();

    await this.logPaymentEvent(
      payment._id.toString(),
      'marked_paid',
      payment.paymentMethod,
      { adminId },
    );
    return payment;
  }

  async markAsUnderReview(paymentId: string) {
    const payment = await this.paymentModel.findById(paymentId).exec();
    if (!payment) {
      throw new NotFoundException(`Payment with id "${paymentId}" not found`);
    }

    payment.status = 'under_review';
    await payment.save();

    const order = await this.ordersService.findById(payment.order.toString());
    order.paymentStatus = 'under_review';
    await order.save();

    await this.logPaymentEvent(
      payment._id.toString(),
      'marked_under_review',
      payment.paymentMethod,
      {},
    );
    return payment;
  }

  async getPaymentByOrder(orderId: string) {
    const payment = await this.paymentModel.findOne({ order: orderId }).exec();
    if (!payment) {
      throw new NotFoundException(`Payment for order "${orderId}" not found`);
    }
    return payment;
  }

  async getPaymentByReference(reference: string) {
    const payment = await this.paymentModel.findOne({ reference }).exec();
    if (!payment) {
      throw new NotFoundException(
        `Payment with reference "${reference}" not found`,
      );
    }
    return payment;
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: string;
    paymentMethod?: string;
    search?: string;
  }) {
    const { page = 1, limit = 20, status, paymentMethod, search } = query;

    const filter: DynamicRecord = {};

    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { orderNumber: { $regex: escaped, $options: 'i' } },
        { reference: { $regex: escaped, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('order')
        .exec(),
      this.paymentModel.countDocuments(filter),
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
    const payment = await this.paymentModel
      .findById(id)
      .populate('order')
      .exec();
    if (!payment) {
      throw new NotFoundException(`Payment with id "${id}" not found`);
    }
    return payment;
  }

  async logPaymentEvent(
    paymentId: string,
    eventType: string,
    provider: string,
    payload?: DynamicValue,
    signature?: string,
    ip?: string,
  ) {
    try {
      await this.paymentEventModel.create({
        payment: paymentId,
        eventType,
        provider,
        payload: toDynamicRecord(payload),
        signature,
        ip,
      });
    } catch (err) {
      this.logger.warn('Failed to log payment event', err);
    }
  }
}
