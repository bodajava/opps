import axios from 'axios';
import { apiClient, mapApiError } from '@/lib/api-client';
import type { ApiResponse, Category } from '@/lib/types';
import { mapCategory, requireDynamicRecord } from './mappers';
import { categoryListEnvelopeSchema, validateContract } from './admin-contracts';

export async function getCategories(): Promise<ApiResponse<Category[]>> {
  try {
    const response = await apiClient.get('/categories');
    const parsed = validateContract(categoryListEnvelopeSchema, response.data, 'GET /categories');
    return {
      success: true,
      statusCode: parsed.statusCode,
      message: parsed.message,
      data: parsed.data.items.map((category) => ({
        ...category,
        image: category.image?.startsWith('/') ? category.image : undefined,
      })),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw mapApiError(error);
    }
    throw error;
  }
}

export async function getCategoryBySlug(slug: string): Promise<ApiResponse<Category>> {
  try {
    const { data } = await apiClient.get(`/categories/${slug}`);
    const envelope = requireDynamicRecord(data, 'GET /categories/:slug');
    return {
      success: true,
      statusCode: 200,
      message: 'Operation successful',
      data: mapCategory(requireDynamicRecord(envelope.data, 'GET /categories/:slug data')),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw mapApiError(error);
    }
    throw error;
  }
}
