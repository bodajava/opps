import { Injectable } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentSession,
  PaymentVerification,
  RefundResult,
} from '../../common/interfaces/payment-provider.interface';
import type { OrderDocument } from '../../orders/schemas/order.schema';

@Injectable()
export class ManualWalletProvider implements PaymentProvider {
  createPayment(order: OrderDocument): Promise<PaymentSession> {
    const reference = `WALLET-${order.orderNumber}-${Date.now()}`;

    return Promise.resolve({
      id: reference,
      reference,
      amount: order.total,
      currency: 'EGP',
      status: 'pending',
      metadata: {
        orderId: order._id?.toString(),
        orderNumber: order.orderNumber,
        instructions:
          'Please send the exact amount to the wallet number provided. Upload your receipt in the order page.',
      },
    });
  }

  verifyPayment(reference: string): Promise<PaymentVerification> {
    return Promise.resolve({
      verified: false,
      reference,
      amount: 0,
      currency: 'EGP',
      status: 'under_review',
      providerData: {
        note: 'Manual wallet payments require admin approval or receipt upload',
      },
    });
  }

  handleWebhook(): Promise<void> {
    return Promise.resolve();
  }

  refundPayment(paymentId: string, amount?: number): Promise<RefundResult> {
    return Promise.resolve({
      success: true,
      amount: amount || 0,
      message: 'Manual wallet refund requires admin action',
    });
  }
}
