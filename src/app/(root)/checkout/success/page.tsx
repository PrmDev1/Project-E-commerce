import Link from "next/link";

type Props = {
  searchParams: Promise<{ session_id?: string; backend_order_id?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const sessionId = params.session_id;
  const backendOrderId = params.backend_order_id;

  if (backendOrderId) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-light-300 bg-light-100 p-8 text-center">
          <h1 className="text-heading-3 text-dark-900">Order placed successfully</h1>
          <p className="mt-2 text-body text-dark-700">Your order has been created in backend system.</p>
          <p className="mt-2 text-caption text-dark-700">Order ID: {backendOrderId}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/"
              className="rounded-full bg-dark-900 px-6 py-3 text-body-medium text-light-100 transition hover:opacity-90"
            >
              Back to Home
            </Link>
            <Link
              href="/products"
              className="rounded-full border border-light-300 px-6 py-3 text-body-medium text-dark-900 transition hover:border-dark-500"
            >
              Continue Shopping
            </Link>
          </div>
        </section>
      </main>
    );
  }

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

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-light-300 bg-light-100 p-8 text-center">
        <h1 className="text-heading-3 text-dark-900">Processing your order</h1>
        <p className="mt-2 text-body text-dark-700">Payment session was received and backend is finalizing your order.</p>
        <p className="mt-2 text-caption text-dark-700">Session ID: {sessionId}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/orders"
            className="rounded-full border border-light-300 px-6 py-3 text-body-medium text-dark-900 transition hover:border-dark-500"
          >
            View Orders
          </Link>
          <Link
            href="/"
            className="rounded-full bg-dark-900 px-6 py-3 text-body-medium text-light-100 transition hover:opacity-90"
          >
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
