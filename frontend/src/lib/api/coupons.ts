import { apiClient, mapApiError } from '@/lib/api-client';
import type { ApiResponse, Coupon, CouponValidation, CouponUsage } from '@/lib/types';

export type CouponPayload = Partial<Omit<Coupon, 'id' | 'createdAt' | 'usedCount'>>;

export async function validateCoupon(
  code: string,
  subtotal?: number,
): Promise<ApiResponse<CouponValidation>> {
  try {
    const { data } = await apiClient.post<ApiResponse<CouponValidation>>('/coupons/validate', {
      code,
      subtotal,
    });
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function getCoupons(params?: {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
}): Promise<ApiResponse<{ items: Coupon[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>> {
  try {
    const { data } = await apiClient.get('/admin/coupons', { params });
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function getCoupon(id: string): Promise<ApiResponse<Coupon>> {
  try {
    const { data } = await apiClient.get<ApiResponse<Coupon>>(`/admin/coupons/${id}`);
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function createCoupon(
  dto: CouponPayload,
): Promise<ApiResponse<Coupon>> {
  try {
    const { data } = await apiClient.post<ApiResponse<Coupon>>('/admin/coupons', dto);
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function updateCoupon(
  id: string,
  dto: CouponPayload,
): Promise<ApiResponse<Coupon>> {
  try {
    const { data } = await apiClient.patch<ApiResponse<Coupon>>(`/admin/coupons/${id}`, dto);
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function deleteCoupon(id: string): Promise<void> {
  try {
    await apiClient.delete(`/admin/coupons/${id}`);
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function getCouponUsage(
  id: string,
  page?: number,
  limit?: number,
): Promise<ApiResponse<{ items: CouponUsage[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>> {
  try {
    const { data } = await apiClient.get(`/admin/coupons/${id}/usage`, { params: { page, limit } });
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}
