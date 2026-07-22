import { apiClient, mapApiError } from "@/lib/api-client"
import {
  categoryListEnvelopeSchema,
  adminCategoryEnvelopeSchema,
  adminProductEnvelopeSchema,
  adminProductListEnvelopeSchema,
  deletedEnvelopeSchema,
  inventoryListEnvelopeSchema,
  ordersByStatusEnvelopeSchema,
  productPerformanceEnvelopeSchema,
  revenueByPaymentEnvelopeSchema,
  salesByGovernorateEnvelopeSchema,
  salesEnvelopeSchema,
  validateContract,
  type AdminCategory,
  type AdminProduct,
  type InventoryItem,
  type PaginationMeta,
} from "./admin-contracts"

export interface PaginatedAdminResult<T> {
  items: T[]
  meta: PaginationMeta
}

export interface ProductFormPayload {
  name: string
  sku: string
  regularPrice: number
  stock: number
  lowStockThreshold?: number
  category?: string
  shortDescription?: string
  images?: string[]
  isActive?: boolean
}

export interface CategoryFormPayload {
  name: string
  description?: string
  sortOrder?: number
  isActive?: boolean
}

export interface ProductListResult {
  items: AdminProduct[]
  pagination: PaginationMeta
}

export async function getAdminProducts(params: {
  page: number
  limit: number
  search?: string
  status?: "in_stock" | "low_stock" | "out_of_stock"
}): Promise<ProductListResult> {
  try {
    const response = await apiClient.get("/admin/products", { params })
    return validateContract(adminProductListEnvelopeSchema, response.data, "GET /admin/products").data
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function createAdminProduct(payload: ProductFormPayload): Promise<AdminProduct> {
  try {
    const response = await apiClient.post("/admin/products", payload)
    return validateContract(adminProductEnvelopeSchema, response.data, "POST /admin/products").data
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function updateAdminProduct(id: string, payload: Partial<ProductFormPayload>): Promise<AdminProduct> {
  try {
    const response = await apiClient.patch(`/admin/products/${id}`, payload)
    return validateContract(adminProductEnvelopeSchema, response.data, "PATCH /admin/products/:id").data
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function archiveAdminProduct(id: string): Promise<AdminProduct> {
  try {
    const response = await apiClient.delete(`/admin/products/${id}`)
    return validateContract(adminProductEnvelopeSchema, response.data, "DELETE /admin/products/:id").data
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function createAdminCategory(payload: CategoryFormPayload): Promise<AdminCategory> {
  try {
    const response = await apiClient.post("/admin/categories", payload)
    return validateContract(adminCategoryEnvelopeSchema, response.data, "POST /admin/categories").data
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function updateAdminCategory(id: string, payload: Partial<CategoryFormPayload>): Promise<AdminCategory> {
  try {
    const response = await apiClient.patch(`/admin/categories/${id}`, payload)
    return validateContract(adminCategoryEnvelopeSchema, response.data, "PATCH /admin/categories/:id").data
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function deleteAdminCategory(id: string): Promise<void> {
  try {
    const response = await apiClient.delete(`/admin/categories/${id}`)
    validateContract(deletedEnvelopeSchema, response.data, "DELETE /admin/categories/:id")
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function getAdminCategories(): Promise<PaginatedAdminResult<AdminCategory>> {
  try {
    const response = await apiClient.get("/admin/categories")
    return validateContract(categoryListEnvelopeSchema, response.data, "GET /admin/categories").data
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function getAdminInventory(): Promise<PaginatedAdminResult<InventoryItem>> {
  try {
    const response = await apiClient.get("/admin/inventory")
    const parsed = validateContract(inventoryListEnvelopeSchema, response.data, "GET /admin/inventory").data
    return {
      ...parsed,
      items: parsed.items.map((item) => ({
        ...item,
        productImage: item.productImage?.startsWith("/") ? item.productImage : undefined,
      })),
    }
  } catch (error) {
    throw mapApiError(error)
  }
}

export interface AnalyticsViewModel {
  salesData: { date: string; revenue: number; orders: number }[]
  ordersByStatus: { name: string; value: number }[]
  revenueByPayment: { name: string; value: number }[]
  productPerformance: { id: string; name: string; unitsSold: number; revenue: number }[]
  salesByGovernorate: { governorate: string; orders: number; revenue: number }[]
}

export async function getAdminAnalytics(startDate?: string, endDate?: string): Promise<AnalyticsViewModel> {
  try {
    const [sales, statuses, payments, products, governorates] = await Promise.all([
      apiClient.get("/admin/analytics/sales", { params: { period: "month", startDate, endDate } }),
      apiClient.get("/admin/analytics/orders-by-status"),
      apiClient.get("/admin/analytics/revenue-by-payment"),
      apiClient.get("/admin/analytics/product-performance", { params: { startDate, endDate } }),
      apiClient.get("/admin/analytics/sales-by-governorate"),
    ])
    const salesData = validateContract(salesEnvelopeSchema, sales.data, "analytics/sales").data
    const ordersByStatus = validateContract(ordersByStatusEnvelopeSchema, statuses.data, "analytics/orders-by-status").data.items
    const revenueByPayment = validateContract(revenueByPaymentEnvelopeSchema, payments.data, "analytics/revenue-by-payment").data
    const productPerformance = validateContract(productPerformanceEnvelopeSchema, products.data, "analytics/product-performance").data
    const salesByGovernorate = validateContract(salesByGovernorateEnvelopeSchema, governorates.data, "analytics/sales-by-governorate").data
    return {
      salesData: salesData.map((point) => ({ date: point.period, revenue: point.sales, orders: point.orders })),
      ordersByStatus: ordersByStatus.map((metric) => ({ name: metric.status, value: metric.count })),
      revenueByPayment: revenueByPayment.map((metric) => ({ name: metric.paymentMethod, value: metric.revenue })),
      productPerformance: productPerformance.map((metric) => ({ id: metric.productId, name: metric.name, unitsSold: metric.quantitySold, revenue: metric.revenue })),
      salesByGovernorate: salesByGovernorate.map((metric) => ({ governorate: metric.governorate, orders: metric.orders, revenue: metric.sales })),
    }
  } catch (error) {
    throw mapApiError(error)
  }
}
