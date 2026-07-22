import { apiClient, mapApiError } from '@/lib/api-client';
import type { ApiResponse } from '@/lib/types';

export async function checkUnsubscribeToken(
  token: string,
): Promise<ApiResponse<{ email: string; valid: boolean }>> {
  try {
    const { data } = await apiClient.get<ApiResponse<{ email: string; valid: boolean }>>(
      '/unsubscribe',
      { params: { token } },
    );
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function unsubscribe(
  token: string,
): Promise<ApiResponse<{ message: string }>> {
  try {
    const { data } = await apiClient.post<ApiResponse<{ message: string }>>(
      '/unsubscribe',
      { token },
    );
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}
