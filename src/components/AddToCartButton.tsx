"use client";

import { useTransition } from "react";
import { ShoppingBag } from "lucide-react";
import { addCartItem } from "@/lib/actions/cart";
import { useCartStore } from "@/store/cart.store";
import { useVariantStore } from "@/store/variant";

type Props = {
  productId: string;
  variantIds: string[];
};

export default function AddToCartButton({ productId, variantIds }: Props) {
  const [isPending, startTransition] = useTransition();
  const setCart = useCartStore((state) => state.setCart);
  const selectedIndex = useVariantStore((state) => state.getSelected(productId, 0));

  const safeIndex = Math.max(0, Math.min(selectedIndex, variantIds.length - 1));
  const selectedVariantId = variantIds[safeIndex] ?? variantIds[0];

  const handleAdd = () => {
    if (!selectedVariantId) return;
    startTransition(async () => {
      const cart = await addCartItem({ productVariantId: selectedVariantId, quantity: 1 });
      setCart(cart);
    });
  };

  return (
    <button
      onClick={handleAdd}
      disabled={!selectedVariantId || isPending}
      className="flex items-center justify-center gap-2 rounded-full bg-dark-900 px-6 py-4 text-body-medium text-light-100 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-dark-500] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <ShoppingBag className="h-5 w-5" />
      {isPending ? "Adding..." : "Add to Bag"}
    </button>
  );
}
