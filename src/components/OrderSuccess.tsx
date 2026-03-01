import Image from "next/image";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  quantity: number;
  unitAmountCents: number;
  lineAmountCents: number;
};

type Props = {
  orderId: string;
  createdAt: Date;
  totalAmountCents: number;
  stripeSessionId: string | null;
  items: OrderItem[];
};

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function OrderSuccess({
  orderId,
  createdAt,
  totalAmountCents,
  stripeSessionId,
  items,
}: Props) {
  return (
    <section className="rounded-xl border border-light-300 bg-light-100 p-6">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-1 h-6 w-6 text-[--color-green]" />
        <div>
          <h1 className="text-heading-3 text-dark-900">Payment successful</h1>
          <p className="mt-1 text-body text-dark-700">Thanks for your purchase. Your order has been confirmed.</p>
          <p className="mt-2 text-caption text-dark-700">
            Order #{orderId.slice(0, 8)} · {createdAt.toLocaleString()}
          </p>
          {stripeSessionId && (
            <p className="mt-1 text-caption text-dark-700">Stripe Session: {stripeSessionId}</p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-lg border border-light-300 p-3 sm:p-4">
            <div className="flex gap-3">
              <Link href={`/products/${item.productId}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-light-200">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" sizes="80px" />
                ) : (
                  <div className="h-full w-full" />
                )}
              </Link>
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                <div>
                  <p className="text-body-medium text-dark-900">{item.productName}</p>
                  <p className="text-caption text-dark-700">
                    Qty {item.quantity} · {formatCents(item.unitAmountCents)} each
                  </p>
                </div>
                <p className="text-body-medium text-dark-900">{formatCents(item.lineAmountCents)}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 border-t border-light-300 pt-4">
        <div className="flex items-center justify-between text-body-medium text-dark-900">
          <span>Total paid</span>
          <span>{formatCents(totalAmountCents)}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/products"
          className="rounded-full border border-light-300 px-6 py-3 text-body-medium text-dark-900 transition hover:border-dark-500"
        >
          Continue Shopping
        </Link>
        <Link
          href="/"
          className="rounded-full bg-dark-900 px-6 py-3 text-body-medium text-light-100 transition hover:opacity-90"
        >
          Back to Home
        </Link>
      </div>
    </section>
  );
}
