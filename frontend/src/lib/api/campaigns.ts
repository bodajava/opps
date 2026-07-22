import { apiClient, mapApiError } from '@/lib/api-client';
import type { ApiResponse } from '@/lib/types';

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  preheader?: string;
  content: string;
  senderName?: string;
  senderEmail?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  audience: 'all' | 'new_customers' | 'returning' | 'high_value' | 'inactive' | 'specific';
  minOrders?: number;
  minSpent?: number;
  inactiveDays?: number;
  customerEmails?: string[];
  scheduledAt?: string;
  sentAt?: string;
  targetCount: number;
  sentCount: number;
  failedCount: number;
  openCount: number;
  clickCount: number;
  createdAt: string;
}

export type CampaignPayload = Partial<Omit<Campaign, 'id' | 'createdAt' | 'sentCount' | 'failedCount' | 'openCount' | 'clickCount' | 'targetCount'>>;

export async function getCampaigns(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<ApiResponse<{ items: Campaign[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>> {
  try {
    const { data } = await apiClient.get('/admin/campaigns', { params });
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function getCampaign(id: string): Promise<ApiResponse<Campaign>> {
  try {
    const { data } = await apiClient.get<ApiResponse<Campaign>>(`/admin/campaigns/${id}`);
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function createCampaign(
  dto: CampaignPayload,
): Promise<ApiResponse<Campaign>> {
  try {
    const { data } = await apiClient.post<ApiResponse<Campaign>>('/admin/campaigns', dto);
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function updateCampaign(
  id: string,
  dto: CampaignPayload,
): Promise<ApiResponse<Campaign>> {
  try {
    const { data } = await apiClient.patch<ApiResponse<Campaign>>(`/admin/campaigns/${id}`, dto);
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function deleteCampaign(id: string): Promise<void> {
  try {
    await apiClient.delete(`/admin/campaigns/${id}`);
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function sendCampaign(id: string): Promise<ApiResponse<Campaign>> {
  try {
    const { data } = await apiClient.post<ApiResponse<Campaign>>(`/admin/campaigns/${id}/send`);
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}
