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
  const selectedSize = useVariantStore((state) => state.getSelectedSize(productId, null));

  const safeIndex = Math.max(0, Math.min(selectedIndex, variantIds.length - 1));
  const selectedVariantId = variantIds[safeIndex] ?? variantIds[0];
  const canAdd = Boolean(selectedVariantId) && Boolean(selectedSize && selectedSize.trim().length > 0);

  const handleAdd = () => {
    if (!selectedVariantId || !selectedSize) return;
    startTransition(async () => {
      const cart = await addCartItem({
        productVariantId: selectedVariantId,
        quantity: 1,
        size: selectedSize,
      });
      setCart(cart);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleAdd}
        disabled={!canAdd || isPending}
        className="flex items-center justify-center gap-2 rounded-full bg-dark-900 px-6 py-4 text-body-medium text-light-100 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-dark-500] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ShoppingBag className="h-5 w-5" />
        {isPending ? "Adding..." : "Add to Bag"}
      </button>
      {!selectedSize && <p className="text-caption text-dark-700">Please select a size before adding to bag.</p>}
    </div>
  );
}
