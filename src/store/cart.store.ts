"use client";

import { create } from "zustand";

export type CartStoreItem = {
  cartItemId: string;
  quantity: number;
  variantId: string;
  sku: string;
  inStock: number;
  unitPrice: number;
  lineTotal: number;
  productId: string;
  productTitle: string;
  productSubtitle: string;
  imageUrl: string | null;
  colorName: string | null;
  sizeName: string | null;
};

export type CartStoreState = {
  cartId: string | null;
  isAuthenticated: boolean;
  items: CartStoreItem[];
  itemCount: number;
  total: number;
  hydrated: boolean;
  setCart: (payload: {
    cartId: string | null;
    isAuthenticated: boolean;
    items: CartStoreItem[];
    itemCount: number;
    total: number;
  }) => void;
  reset: () => void;
};

const initialState = {
  cartId: null,
  isAuthenticated: false,
  items: [] as CartStoreItem[],
  itemCount: 0,
  total: 0,
  hydrated: false,
};

export const useCartStore = create<CartStoreState>((set) => ({
  ...initialState,
  setCart: (payload) =>
    set({
      cartId: payload.cartId,
      isAuthenticated: payload.isAuthenticated,
      items: payload.items,
      itemCount: payload.itemCount,
      total: payload.total,
      hydrated: true,
    }),
  reset: () => set(initialState),
}));
