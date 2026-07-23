import { apiClient, mapApiError } from "@/lib/api-client"
import type { ApiResponse, Cart } from "@/lib/types"
import { mapCart } from "./mappers"

function cartResponse(response: ApiResponse<DynamicRecord>): ApiResponse<Cart> {
  return { ...response, data: mapCart(response.data) }
}

export async function getCart(): Promise<ApiResponse<Cart>> {
  try {
    const { data } = await apiClient.get<ApiResponse<DynamicRecord>>("/cart")
    return cartResponse(data)
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function addToCart(dto: { productId: string; variantId?: string; quantity: number }): Promise<ApiResponse<Cart>> {
  try {
    const { data } = await apiClient.post<ApiResponse<DynamicRecord>>("/cart/items", dto)
    return cartResponse(data)
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function updateCartItem(dto: { itemId: string; quantity: number }): Promise<ApiResponse<Cart>> {
  try {
    const { data } = await apiClient.patch<ApiResponse<DynamicRecord>>("/cart/items", {
      itemId: dto.itemId,
      quantity: dto.quantity,
    })
    return cartResponse(data)
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function removeCartItem(itemId: string): Promise<ApiResponse<Cart>> {
  try {
    const { data } = await apiClient.delete<ApiResponse<DynamicRecord>>(`/cart/items/${itemId}`)
    return cartResponse(data)
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function applyCoupon(code: string): Promise<ApiResponse<Cart>> {
  try {
    const { data } = await apiClient.post<ApiResponse<DynamicRecord>>("/cart/coupon", { code })
    return cartResponse(data)
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function removeCoupon(): Promise<ApiResponse<Cart>> {
  try {
    const { data } = await apiClient.delete<ApiResponse<DynamicRecord>>("/cart/coupon")
    return cartResponse(data)
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function clearCart(): Promise<void> {
  try {
    await apiClient.delete("/cart")
  } catch (error) {
    throw mapApiError(error)
  }
}
