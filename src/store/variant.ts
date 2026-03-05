"use client";

import { create } from "zustand";

type State = {
  selectedByProduct: Record<string, number>;
  selectedSizeByProduct: Record<string, string | null>;
  setSelected: (productId: string, index: number) => void;
  getSelected: (productId: string, fallback?: number) => number;
  setSelectedSize: (productId: string, size: string | null) => void;
  getSelectedSize: (productId: string, fallback?: string | null) => string | null;
};

export const useVariantStore = create<State>((set, get) => ({
  selectedByProduct: {},
  selectedSizeByProduct: {},
  setSelected: (productId, index) =>
    set((s) => ({
      selectedByProduct: { ...s.selectedByProduct, [productId]: index },
    })),
  getSelected: (productId, fallback = 0) => {
    const map = get().selectedByProduct;
    return map[productId] ?? fallback;
  },
  setSelectedSize: (productId, size) =>
    set((s) => ({
      selectedSizeByProduct: { ...s.selectedSizeByProduct, [productId]: size },
    })),
  getSelectedSize: (productId, fallback = null) => {
    const map = get().selectedSizeByProduct;
    return map[productId] ?? fallback;
  },
}));
