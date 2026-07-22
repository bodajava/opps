import { apiClient, mapApiError } from '@/lib/api-client';
import type { ApiResponse, Cart } from '@/lib/types';

export async function getCart(): Promise<ApiResponse<Cart>> {
  try {
    const { data } = await apiClient.get<ApiResponse<Cart>>('/cart');
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function addToCart(dto: {
  productId: string;
  variantId?: string;
  quantity: number;
}): Promise<ApiResponse<Cart>> {
  try {
    const { data } = await apiClient.post<ApiResponse<Cart>>('/cart/items', dto);
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function updateCartItem(dto: {
  itemId: string;
  quantity: number;
}): Promise<ApiResponse<Cart>> {
  try {
    const { data } = await apiClient.patch<ApiResponse<Cart>>('/cart/items', {
      itemId: dto.itemId,
      quantity: dto.quantity,
    });
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function removeCartItem(itemId: string): Promise<ApiResponse<Cart>> {
  try {
    const { data } = await apiClient.delete<ApiResponse<Cart>>(`/cart/items/${itemId}`);
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function applyCoupon(code: string): Promise<ApiResponse<Cart>> {
  try {
    const { data } = await apiClient.post<ApiResponse<Cart>>('/cart/coupon', { code });
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function removeCoupon(): Promise<ApiResponse<Cart>> {
  try {
    const { data } = await apiClient.delete<ApiResponse<Cart>>('/cart/coupon');
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function clearCart(): Promise<void> {
  try {
    await apiClient.delete('/cart');
  } catch (error) {
    throw mapApiError(error);
  }
}
