import Link from "next/link";
import OrderSuccess from "@/components/OrderSuccess";
import { createOrder, getOrderByStripeSessionId } from "@/lib/actions/orders";

type Props = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const sessionId = params.session_id;

  if (!sessionId) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-light-300 bg-light-100 p-8 text-center">
          <h1 className="text-heading-3 text-dark-900">Missing checkout session</h1>
          <p className="mt-2 text-body text-dark-700">We could not find your checkout details.</p>
          <Link
            href="/cart"
            className="mt-6 inline-block rounded-full bg-dark-900 px-6 py-3 text-body-medium text-light-100 transition hover:opacity-90"
          >
            Return to Cart
          </Link>
        </section>
      </main>
    );
  }

  let order = await getOrderByStripeSessionId(sessionId);

  if (!order) {
    try {
      await createOrder(sessionId);
    } catch {
      // If webhook is still processing, keep graceful fallback below.
    }
    order = await getOrderByStripeSessionId(sessionId);
  }

  if (!order) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-light-300 bg-light-100 p-8 text-center">
          <h1 className="text-heading-3 text-dark-900">Processing your order</h1>
          <p className="mt-2 text-body text-dark-700">Payment was received. Your order is being finalized.</p>
          <p className="mt-2 text-caption text-dark-700">Refresh in a few seconds if this page does not update.</p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full border border-light-300 px-6 py-3 text-body-medium text-dark-900 transition hover:border-dark-500"
          >
            Back to Home
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <OrderSuccess
        orderId={order.id}
        createdAt={order.createdAt}
        totalAmountCents={order.totalAmountCents}
        stripeSessionId={order.stripeSessionId ?? null}
        items={order.items}
      />
    </main>
  );
}
