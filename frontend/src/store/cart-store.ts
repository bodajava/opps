import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/lib/types';

interface CartState {
  items: CartItem[];
  couponCode: string | null;
  discount: number;
  deliveryFee: number;
  subtotal: number;
  total: number;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  applyCoupon: (code: string, discount: number) => void;
  removeCoupon: () => void;
  clearCart: () => void;
  setCart: (cart: {
    items: CartItem[];
    couponCode?: string | null;
    discount?: number;
    deliveryFee?: number;
    subtotal?: number;
    total?: number;
  }) => void;
}

function recalculate(
  items: CartItem[],
  discount: number,
  deliveryFee: number,
) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = Math.max(0, subtotal - discount + deliveryFee);
  return { subtotal, total };
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      couponCode: null,
      discount: 0,
      deliveryFee: 0,
      subtotal: 0,
      total: 0,

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId && i.variantId === item.variantId,
          );
          let newItems: CartItem[];
          if (existing) {
            newItems = state.items.map((i) =>
              i.productId === item.productId && i.variantId === item.variantId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i,
            );
          } else {
            newItems = [...state.items, item];
          }
          const { subtotal, total } = recalculate(newItems, state.discount, state.deliveryFee);
          return { items: newItems, subtotal, total };
        }),

      removeItem: (itemId) =>
        set((state) => {
          const newItems = state.items.filter((i) => i.id !== itemId);
          const { subtotal, total } = recalculate(newItems, state.discount, state.deliveryFee);
          return { items: newItems, subtotal, total };
        }),

      updateQuantity: (itemId, quantity) =>
        set((state) => {
          if (quantity < 1) {
            const newItems = state.items.filter((i) => i.id !== itemId);
            const { subtotal, total } = recalculate(newItems, state.discount, state.deliveryFee);
            return { items: newItems, subtotal, total };
          }
          const newItems = state.items.map((i) =>
            i.id === itemId ? { ...i, quantity } : i,
          );
          const { subtotal, total } = recalculate(newItems, state.discount, state.deliveryFee);
          return { items: newItems, subtotal, total };
        }),

      applyCoupon: (code, discount) =>
        set((state) => {
          const { subtotal, total } = recalculate(state.items, discount, state.deliveryFee);
          return { couponCode: code, discount, subtotal, total };
        }),

      removeCoupon: () =>
        set((state) => {
          const { subtotal, total } = recalculate(state.items, 0, state.deliveryFee);
          return { couponCode: null, discount: 0, subtotal, total };
        }),

      clearCart: () =>
        set({
          items: [],
          couponCode: null,
          discount: 0,
          deliveryFee: 0,
          subtotal: 0,
          total: 0,
        }),

      setCart: (cart) =>
        set({
          items: cart.items,
          couponCode: cart.couponCode ?? null,
          discount: cart.discount ?? 0,
          deliveryFee: cart.deliveryFee ?? 0,
          subtotal: cart.subtotal ?? 0,
          total: cart.total ?? 0,
        }),
    }),
    { name: 'opps-cart' },
  ),
);
