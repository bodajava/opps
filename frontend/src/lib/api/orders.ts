import { apiClient, mapApiError } from '@/lib/api-client';
import type { ApiResponse, Order } from '@/lib/types';
import { mapOrder, requireDynamicRecord, requireDynamicRecords } from './mappers';

export async function trackOrder(orderNumber: string, email: string): Promise<ApiResponse<Order>> {
  try {
    const { data } = await apiClient.get(`/orders/track/${orderNumber}`, {
      params: { email },
    });
    const envelope = requireDynamicRecord(data, 'GET /orders/track/:orderNumber');
    return {
      success: true,
      statusCode: 200,
      message: 'Operation successful',
      data: mapOrder(requireDynamicRecord(envelope.data, 'GET /orders/track/:orderNumber data')),
    };
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function getMyOrders(): Promise<ApiResponse<Order[]>> {
  try {
    const { data } = await apiClient.get('/orders');
    const envelope = requireDynamicRecord(data, 'GET /orders');
    return {
      success: true,
      statusCode: 200,
      message: 'Operation successful',
      data: requireDynamicRecords(envelope.data, 'GET /orders data').map(mapOrder),
    };
  } catch (error) {
    throw mapApiError(error);
  }
}
