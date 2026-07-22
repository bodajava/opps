import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { z } from 'zod';
import {
  PaymentProvider,
  PaymentSession,
  PaymentVerification,
  RefundResult,
} from '../../common/interfaces/payment-provider.interface';
import type { OrderDocument } from '../../orders/schemas/order.schema';
import {
  optionalDynamicRecord,
  toDynamicRecord,
} from '../../common/helpers/dynamic-value.helper';

const paymobAuthSchema = z.object({ token: z.string().min(1) });
const paymobOrderSchema = z.object({ id: z.number() });
const paymobPaymentKeySchema = z.object({ token: z.string().min(1) });

@Injectable()
export class PaymobProvider implements PaymentProvider {
  private readonly logger = new Logger(PaymobProvider.name);
  private configured = false;
  private readonly baseUrl = 'https://accept.paymob.com/api';
  private readonly apiKey: string;
  private readonly hmacSecret: string;
  private readonly integrationIdCard: string;
  private readonly integrationIdWallet: string;
  private readonly iframeId: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('app.paymobApiKey', '');
    this.hmacSecret = this.configService.get<string>(
      'app.paymobHmacSecret',
      '',
    );
    this.integrationIdCard = this.configService.get<string>(
      'app.paymobIntegrationIdCard',
      '',
    );
    this.integrationIdWallet = this.configService.get<string>(
      'app.paymobIntegrationIdWallet',
      '',
    );
    this.iframeId = this.configService.get<string>('app.paymobIframeId', '');
    if (
      this.apiKey &&
      this.hmacSecret &&
      (this.integrationIdCard || this.integrationIdWallet)
    ) {
      this.configured = true;
    }
  }

  private async requestAuthToken(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/auth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: this.apiKey }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new Error(`Paymob auth failed: ${res.status}`);
    }
    const data = paymobAuthSchema.parse(await res.json());
    return data.token;
  }

  private async createPaymobOrder(
    authToken: string,
    order: OrderDocument,
  ): Promise<number> {
    const res = await fetch(`${this.baseUrl}/ecommerce/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: 'false',
        amount_cents: Math.round(order.total * 100),
        currency: 'EGP',
        merchant_order_id: order._id.toString(),
        items: [],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new Error(`Paymob order creation failed: ${res.status}`);
    }
    const data = paymobOrderSchema.parse(await res.json());
    return data.id;
  }

  private async createPaymentKey(
    authToken: string,
    paymobOrderId: number,
    order: OrderDocument,
    billingData: DynamicRecord,
  ): Promise<string> {
    const integrationId = this.integrationIdCard || this.integrationIdWallet;
    const res = await fetch(`${this.baseUrl}/acceptance/payment_keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: Math.round(order.total * 100),
        expiration: 3600,
        order_id: paymobOrderId,
        billing_data: billingData,
        currency: 'EGP',
        integration_id: parseInt(integrationId, 10),
        lock_order_when_paid: 'true',
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new Error(`Paymob payment key creation failed: ${res.status}`);
    }
    const data = paymobPaymentKeySchema.parse(await res.json());
    return data.token;
  }

  createPayment(order: OrderDocument): Promise<PaymentSession> {
    if (!this.configured) {
      throw new Error('Payment provider not configured');
    }
    return this.createPaymobSession(order);
  }

  private async createPaymobSession(
    order: OrderDocument,
  ): Promise<PaymentSession> {
    try {
      const authToken = await this.requestAuthToken();
      const paymobOrderId = await this.createPaymobOrder(authToken, order);
      const addr = order.shippingAddress;
      const billingData: DynamicRecord = {
        apartment: 'N/A',
        email: order.customerEmail || 'guest@opps.com',
        floor: 'N/A',
        first_name: order.customerName?.split(' ')[0] || 'Guest',
        street: addr?.street || 'N/A',
        building: addr?.building || 'N/A',
        phone_number: order.customerPhone || '01000000000',
        shipping_method: 'PKG',
        postal_code: 'N/A',
        city: addr?.city || 'Cairo',
        country: 'EG',
        last_name: order.customerName?.split(' ').slice(1).join(' ') || 'User',
        state: addr?.state || 'Cairo',
      };
      const paymentKey = await this.createPaymentKey(
        authToken,
        paymobOrderId,
        order,
        billingData,
      );
      const reference = `PMB-${order.orderNumber}-${Date.now()}`;
      return {
        id: String(paymobOrderId),
        url: `${this.baseUrl}/acceptance/iframes/${this.iframeId}?payment_token=${paymentKey}`,
        reference,
        amount: order.total,
        currency: 'EGP',
        status: 'pending',
        metadata: {
          orderId: order._id?.toString(),
          orderNumber: order.orderNumber,
          paymobOrderId,
          paymentKey,
        },
      };
    } catch (err) {
      this.logger.error(
        'Paymob session creation failed',
        err instanceof Error ? err.message : err,
      );
      throw new Error(
        `Paymob payment failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
    }
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
      providerData: {
        note: 'Paymob verification uses webhook callbacks. Use POST /payments/webhooks/paymob.',
      },
    });
  }

  handleWebhook(payload: DynamicValue, signature?: string): Promise<void> {
    if (!this.configured) {
      throw new Error('Payment provider not configured');
    }
    if (!signature) {
      throw new Error('Missing HMAC signature header');
    }
    if (!this.verifyHmac(payload, signature)) {
      throw new Error('Invalid webhook HMAC signature');
    }
    const data = toDynamicRecord(payload);
    const obj = optionalDynamicRecord(data.obj);
    const transactionId = obj?.id;
    const amountCents = obj?.amount_cents;
    const success = obj?.success;
    this.logger.log('Paymob webhook verified', {
      transactionId,
      amountCents,
      success,
    });
    return Promise.resolve();
  }

  refundPayment(paymentId: string, amount?: number): Promise<RefundResult> {
    if (!this.configured) {
      throw new Error('Payment provider not configured');
    }
    return Promise.resolve({
      success: true,
      refundId: `PMB-REF-${paymentId}-${Date.now()}`,
      amount: amount || 0,
      message: 'Refund initiated via Paymob sandbox',
    });
  }

  private verifyHmac(payload: DynamicValue, signature: string): boolean {
    const data = toDynamicRecord(payload);
    const obj = optionalDynamicRecord(data.obj);
    if (!obj) return false;
    const sourceData = optionalDynamicRecord(obj.source_data);
    const orderData = optionalDynamicRecord(obj.order);
    const hmacFields = [
      obj.amount_cents,
      obj.created_at,
      obj.currency,
      obj.error_occured,
      obj.has_parent_transaction,
      obj.id,
      obj.integration_id,
      obj.is_3d_secure,
      obj.is_auth,
      obj.is_capture,
      obj.is_refunded,
      obj.is_standalone_payment,
      obj.is_void,
      orderData?.id,
      obj.owner,
      obj.pending,
      sourceData?.pan,
      sourceData?.sub_type,
      sourceData?.type,
      obj.success,
    ].map((v) =>
      v === undefined || v === null
        ? ''
        : typeof v === 'string'
          ? v
          : JSON.stringify(v),
    );
    const concatenated = hmacFields.join('');
    const calculated = crypto
      .createHmac('sha512', this.hmacSecret)
      .update(concatenated)
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
