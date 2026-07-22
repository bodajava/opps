import type { OrderDocument } from '../../orders/schemas/order.schema';

export interface PaymentSession {
  id: string;
  url?: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  metadata?: DynamicRecord;
}

export interface PaymentVerification {
  verified: boolean;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  providerData?: DynamicRecord;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount?: number;
  message?: string;
}

export interface PaymentProvider {
  createPayment(order: OrderDocument): Promise<PaymentSession>;
  verifyPayment(reference: string): Promise<PaymentVerification>;
  handleWebhook(payload: DynamicValue, signature?: string): Promise<void>;
  refundPayment?(paymentId: string, amount?: number): Promise<RefundResult>;
}
