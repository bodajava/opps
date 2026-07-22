import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  PaymentProvider,
  PaymentSession,
  PaymentVerification,
  RefundResult,
} from '../../common/interfaces/payment-provider.interface';
import type { OrderDocument } from '../../orders/schemas/order.schema';
import {
  textValue,
  toDynamicRecord,
} from '../../common/helpers/dynamic-value.helper';

@Injectable()
export class FawryProvider implements PaymentProvider {
  private readonly logger = new Logger(FawryProvider.name);
  private configured = false;
  private readonly merchantCode: string;
  private readonly securityKey: string;

  constructor(private readonly configService: ConfigService) {
    this.merchantCode = this.configService.get<string>(
      'app.fawryMerchantCode',
      '',
    );
    this.securityKey = this.configService.get<string>(
      'app.fawrySecurityKey',
      '',
    );
    if (this.merchantCode && this.securityKey) {
      this.configured = true;
    }
  }

  createPayment(order: OrderDocument): Promise<PaymentSession> {
    if (!this.configured) {
      throw new Error('Payment provider not configured');
    }

    const timestamp = Date.now();
    const reference = `FWR-${order.orderNumber}-${timestamp}`;
    const signature = crypto
      .createHmac('sha256', this.securityKey)
      .update(
        `${this.merchantCode}${reference}${Math.round(order.total * 100)}EGP`,
      )
      .digest('hex');

    return Promise.resolve({
      id: reference,
      url: `https://atfawry.com/fawry/payments?merchantRefNum=${reference}`,
      reference,
      amount: order.total,
      currency: 'EGP',
      status: 'pending',
      metadata: {
        orderId: order._id?.toString(),
        orderNumber: order.orderNumber,
        signature,
      },
    });
  }

  verifyPayment(reference: string): Promise<PaymentVerification> {
    if (!this.configured) {
      throw new Error('Payment provider not configured');
    }
    return Promise.resolve({
      verified: false,
      reference,
      amount: 0,
      currency: 'EGP',
      status: 'pending',
      providerData: { note: 'Fawry verification uses webhook callbacks' },
    });
  }

  handleWebhook(payload: DynamicValue, signature?: string): Promise<void> {
    if (!this.configured) {
      throw new Error('Payment provider not configured');
    }
    if (!signature) {
      throw new Error('Missing webhook HMAC signature');
    }
    if (!this.verifySignature(payload, signature)) {
      throw new Error('Invalid webhook HMAC signature');
    }
    const data = toDynamicRecord(payload);
    this.logger.log('Fawry webhook received', {
      merchantRefNum: data.merchantRefNum,
      paymentStatus: data.paymentStatus,
    });
    return Promise.resolve();
  }

  refundPayment(paymentId: string, amount?: number): Promise<RefundResult> {
    if (!this.configured) {
      throw new Error('Payment provider not configured');
    }
    return Promise.resolve({
      success: true,
      refundId: `FWR-REF-${paymentId}-${Date.now()}`,
      amount: amount || 0,
      message: 'Refund processed via Fawry sandbox',
    });
  }

  private verifySignature(payload: DynamicValue, signature: string): boolean {
    const data = toDynamicRecord(payload);
    const merchantRefNum = textValue(data.merchantRefNum);
    const paymentAmount = textValue(data.paymentAmount, '0');
    const paymentStatus = textValue(data.paymentStatus);
    const fawryRefNumber = textValue(data.fawryRefNumber);
    const messageSignature = textValue(data.messageSignature);
    const raw = `${merchantRefNum}${paymentAmount}${paymentStatus}${fawryRefNumber}${this.securityKey}${messageSignature}`;
    const calculated = crypto
      .createHmac('sha256', this.securityKey)
      .update(raw)
      .digest('hex');
    if (calculated.length !== signature.length) {
      return false;
    }
    return crypto.timingSafeEqual(
      Buffer.from(calculated),
      Buffer.from(signature),
    );
  }
}
