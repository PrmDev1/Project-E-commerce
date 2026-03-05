"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { createStripeCheckoutSession } from "@/lib/actions/checkout";

type Props = {
  cartId: string | null;
  subtotalCents: number;
  disabled?: boolean;
};

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
  }).format(cents / 100);
}

export default function CartSummary({ cartId, subtotalCents, disabled = false }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = () => {
    if (!cartId || disabled) return;
    setError(null);

    startTransition(async () => {
      try {
        const { url } = await createStripeCheckoutSession(cartId);
        window.location.assign(url);
      } catch (checkoutError) {
        const message = checkoutError instanceof Error ? checkoutError.message : "Unable to start checkout";
        setError(message);
      }
    });
  };

  return (
    <aside className="h-fit rounded-xl border border-light-300 bg-light-100 p-5">
      <h2 className="text-heading-4 text-dark-900">Summary</h2>

      <div className="mt-4 rounded-lg border border-light-300 bg-light-100 p-3">
        <p className="text-caption text-dark-700">Shipping Address</p>
        <Link
          href="/addresses"
          className="mt-2 inline-flex w-full items-center justify-center rounded-full border border-dark-900 px-4 py-2 text-body-medium text-dark-900 transition hover:bg-light-200"
        >
          Manage Addresses
        </Link>
      </div>

      <div className="mt-4 space-y-2 text-body text-dark-700">
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span className="text-dark-900">{formatCents(subtotalCents)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Shipping</span>
          <span className="text-dark-900">Calculated at checkout</span>
        </div>
      </div>

      <div className="mt-4 border-t border-light-300 pt-4">
        <div className="flex items-center justify-between text-body-medium text-dark-900">
          <span>Total</span>
          <span>{formatCents(subtotalCents)}</span>
        </div>
      </div>

      <button
        onClick={handleCheckout}
        disabled={disabled || !cartId || isPending}
        className="mt-5 w-full rounded-full bg-dark-900 px-6 py-3 text-body-medium text-light-100 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Redirecting..." : "Checkout"}
      </button>

      <p className="mt-3 inline-flex items-center gap-2 text-caption text-dark-700">
        <ShieldCheck className="h-4 w-4" />
        Secure checkout
      </p>

      {error && <p className="mt-2 text-caption text-red-600">{error}</p>}
    </aside>
  );
}
