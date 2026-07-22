import { apiClient, mapApiError } from '@/lib/api-client';
import type { ApiResponse, PaginatedResponse, Product } from '@/lib/types';
import { mapProduct, mapPaginatedResponse, requireDynamicRecord, requireDynamicRecords } from './mappers';

export async function getProducts(params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
}): Promise<PaginatedResponse<Product>> {
  try {
    const response = await apiClient.get('/products', { params });
    const envelope = requireDynamicRecord(response.data, 'GET /products');
    return mapPaginatedResponse(requireDynamicRecord(envelope.data, 'GET /products data'), mapProduct);
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function getProductBySlug(slug: string): Promise<ApiResponse<Product>> {
  try {
    const { data } = await apiClient.get(`/products/${slug}`);
    const envelope = requireDynamicRecord(data, 'GET /products/:slug');
    return {
      success: true,
      statusCode: 200,
      message: 'Operation successful',
      data: mapProduct(requireDynamicRecord(envelope.data, 'GET /products/:slug data')),
    };
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function getFeaturedProducts(): Promise<ApiResponse<Product[]>> {
  try {
    const { data } = await apiClient.get('/products/featured');
    const envelope = requireDynamicRecord(data, 'GET /products/featured');
    return {
      success: true,
      statusCode: 200,
      message: 'Operation successful',
      data: requireDynamicRecords(envelope.data, 'GET /products/featured data').map(mapProduct),
    };
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function getBestSellers(): Promise<ApiResponse<Product[]>> {
  try {
    const { data } = await apiClient.get('/products/best-sellers');
    const envelope = requireDynamicRecord(data, 'GET /products/best-sellers');
    return {
      success: true,
      statusCode: 200,
      message: 'Operation successful',
      data: requireDynamicRecords(envelope.data, 'GET /products/best-sellers data').map(mapProduct),
    };
  } catch (error) {
    throw mapApiError(error);
  }
}
