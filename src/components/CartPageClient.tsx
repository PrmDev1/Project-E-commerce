"use client";
import Link from "next/link";
import { useEffect, useMemo, useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import {
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
  type CartView,
} from "@/lib/actions/cart";
import { useCartStore } from "@/store/cart.store";
import CartSummary from "@/components/CartSummary";

type Props = {
  initialCart: CartView;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
  }).format(value);

export default function CartPageClient({ initialCart }: Props) {
  const [isPending, startTransition] = useTransition();
  const setCart = useCartStore((state) => state.setCart);
  const cartId = useCartStore((state) => state.cartId);
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.total);
  const itemCount = useCartStore((state) => state.itemCount);

  useEffect(() => {
    setCart(initialCart);
  }, [initialCart, setCart]);

  useEffect(() => {
    startTransition(async () => {
      const latest = await getCart();
      setCart(latest);
    });
  }, [setCart]);

  const subtotal = useMemo(() => total, [total]);

  const handleQty = (cartItemId: string, nextQty: number) => {
    startTransition(async () => {
      const updated = await updateCartItem({ cartItemId, quantity: nextQty });
      setCart(updated);
    });
  };

  const handleRemove = (cartItemId: string) => {
    startTransition(async () => {
      const updated = await removeCartItem({ cartItemId });
      setCart(updated);
    });
  };

  const handleClear = () => {
    startTransition(async () => {
      const updated = await clearCart();
      setCart(updated);
    });
  };

  return (
    <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-body text-dark-700">{itemCount} item(s) in your bag</p>
          {items.length > 0 && (
            <button
              onClick={handleClear}
              disabled={isPending}
              className="text-caption text-dark-700 underline-offset-2 hover:underline disabled:opacity-50"
            >
              Clear bag
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-light-300 bg-light-100 p-8 text-center">
            <h2 className="text-heading-4 text-dark-900">Your cart is empty</h2>
            <p className="mt-2 text-body text-dark-700">Add products from our latest collection.</p>
            <Link
              href="/products"
              className="mt-6 inline-block rounded-full bg-dark-900 px-6 py-3 text-body-medium text-light-100 transition hover:opacity-90"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.cartItemId} className="rounded-xl border border-light-300 bg-light-100 p-4 sm:p-5">
                <div className="flex gap-4">
                  <Link href={`/products/${item.productId}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-light-200">
                    {item.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={item.imageUrl} alt={item.productTitle} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="h-full w-full" />
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/products/${item.productId}`} className="text-body-medium text-dark-900 hover:underline">
                          {item.productTitle}
                        </Link>
                        <p className="text-caption text-dark-700">{item.productSubtitle}</p>
                        <p className="text-caption text-dark-700">
                          {item.colorName ?? "Size"} : {item.sizeName ?? "One Size"}
                        </p>
                      </div>
                      <p className="text-body-medium text-dark-900">{formatCurrency(item.lineTotal)}</p>
                    </div>

                    <div className="mt-1 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-full border border-light-300">
                        <button
                          onClick={() => handleQty(item.cartItemId, item.quantity - 1)}
                          disabled={isPending}
                          className="p-2 text-dark-900 disabled:opacity-50"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-8 px-2 text-center text-caption text-dark-900">{item.quantity}</span>
                        <button
                          onClick={() => handleQty(item.cartItemId, item.quantity + 1)}
                          disabled={isPending}
                          className="p-2 text-dark-900 disabled:opacity-50"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemove(item.cartItemId)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 text-caption text-dark-700 hover:text-dark-900 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CartSummary cartId={cartId} subtotalCents={Math.round(subtotal * 100)} disabled={items.length === 0 || isPending} />
    </section>
  );
}
