import { Injectable } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentSession,
  PaymentVerification,
  RefundResult,
} from '../../common/interfaces/payment-provider.interface';
import type { OrderDocument } from '../../orders/schemas/order.schema';

@Injectable()
export class CodProvider implements PaymentProvider {
  createPayment(order: OrderDocument): Promise<PaymentSession> {
    return Promise.resolve({
      id: `cod-${order._id.toString()}`,
      reference: `COD-${order.orderNumber}-${Date.now()}`,
      amount: order.total,
      currency: 'EGP',
      status: 'pending',
      metadata: {
        orderId: order._id?.toString(),
        orderNumber: order.orderNumber,
      },
    });
  }

  verifyPayment(reference: string): Promise<PaymentVerification> {
    return Promise.resolve({
      verified: false,
      reference,
      amount: 0,
      currency: 'EGP',
      status: 'pending',
      providerData: { note: 'COD is verified upon delivery, not via API' },
    });
  }

  handleWebhook(): Promise<void> {
    return Promise.resolve();
  }

  refundPayment(paymentId: string, amount?: number): Promise<RefundResult> {
    return Promise.resolve({
      success: true,
      amount: amount || 0,
      message: 'COD refund processed manually',
    });
  }
}
