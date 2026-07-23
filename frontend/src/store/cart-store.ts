import { create } from "zustand"
import type { Cart, CartItem } from "@/lib/types"
import { addToCart, applyCoupon as applyCouponApi, getCart, removeCartItem, removeCoupon as removeCouponApi, updateCartItem } from "@/lib/api/cart"

interface CartState {
  items: CartItem[]
  couponCode: string | null
  discount: number
  deliveryFee: number
  subtotal: number
  total: number
  isLoading: boolean
  loadCart: () => Promise<void>
  addProduct: (productId: string, variantId: string | undefined, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  applyCoupon: (code: string) => Promise<void>
  removeCoupon: () => Promise<void>
  clearLocalCart: () => void
  clearCart: () => void
  setCart: (cart: Cart) => void
}

function cartState(cart: Cart): Pick<CartState, "items" | "couponCode" | "discount" | "deliveryFee" | "subtotal" | "total"> {
  return {
    items: cart.items,
    couponCode: cart.couponCode ?? null,
    discount: cart.discount ?? 0,
    deliveryFee: cart.deliveryFee ?? 0,
    subtotal: cart.subtotal ?? 0,
    total: cart.total ?? 0,
  }
}

const emptyCart = {
  items: [],
  couponCode: null,
  discount: 0,
  deliveryFee: 0,
  subtotal: 0,
  total: 0,
}

export const useCartStore = create<CartState>((set) => ({
  ...emptyCart,
  isLoading: false,
  setCart: (cart) => set(cartState(cart)),
  clearLocalCart: () => set({ ...emptyCart, isLoading: false }),
  clearCart: () => set({ ...emptyCart, isLoading: false }),
  loadCart: async () => {
    set({ isLoading: true })
    try {
      const response = await getCart()
      set({ ...cartState(response.data), isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },
  addProduct: async (productId, variantId, quantity) => {
    const response = await addToCart({ productId, variantId, quantity })
    set(cartState(response.data))
  },
  removeItem: async (itemId) => {
    const response = await removeCartItem(itemId)
    set(cartState(response.data))
  },
  updateQuantity: async (itemId, quantity) => {
    const response = await updateCartItem({ itemId, quantity })
    set(cartState(response.data))
  },
  applyCoupon: async (code) => {
    const response = await applyCouponApi(code)
    set(cartState(response.data))
  },
  removeCoupon: async () => {
    const response = await removeCouponApi()
    set(cartState(response.data))
  },
}))
