import { apiClient, mapApiError } from '@/lib/api-client';
import type { ApiResponse, CheckoutQuote, Order } from '@/lib/types';

export async function getQuote(dto: {
  items: Array<{ productId: string; variantId?: string; quantity: number }>;
  couponCode?: string;
  deliveryZoneId?: string;
}): Promise<ApiResponse<CheckoutQuote>> {
  try {
    const { data } = await apiClient.post<ApiResponse<CheckoutQuote>>('/checkout/quote', dto);
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function sendOTP(email: string, purpose?: string): Promise<ApiResponse<null>> {
  try {
    const { data } = await apiClient.post<ApiResponse<null>>('/checkout/email/send-otp', { email, purpose });
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function verifyOTP(email: string, otp: string, purpose?: string): Promise<ApiResponse<{ proofToken?: string }>> {
  try {
    const { data } = await apiClient.post<ApiResponse<{ proofToken?: string }>>('/checkout/email/verify-otp', {
      email,
      otp,
      purpose,
    });
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function createOrder(dto: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  secondaryPhone?: string;
  shippingAddress: {
    governorate: string;
    city: string;
    district: string;
    street: string;
    buildingNumber: string;
    floor?: string;
    apartment?: string;
    landmark?: string;
    deliveryNotes?: string;
  };
  items: Array<{ productId: string; variantId?: string; quantity: number }>;
  paymentMethod: string;
  couponCode?: string;
  customerNotes?: string;
  verificationProof?: string;
  idempotencyKey?: string;
}): Promise<ApiResponse<Order>> {
  try {
    const { data } = await apiClient.post<ApiResponse<Order>>('/checkout/orders', dto);
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}
