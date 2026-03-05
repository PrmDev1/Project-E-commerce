import Link from "next/link";
import { redirect } from "next/navigation";
import { getBackendCurrentUser } from "@/lib/auth/backend";
import { getPaidOrdersByUserId } from "@/lib/actions/orders";

async function retryOrdersAction() {
  "use server";
  redirect(`/orders?retry=${Date.now()}`);
}

function formatTHBFromCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
  }).format(cents / 100);
}

export default async function OrdersPage() {
  const user = await getBackendCurrentUser();

  if (!user?.id) {
    redirect("/sign-in?next=%2Forders");
  }

  let paidOrders: Awaited<ReturnType<typeof getPaidOrdersByUserId>> = [];
  let loadError: string | null = null;

  try {
    paidOrders = await getPaidOrdersByUserId(user.id);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unable to load your order history right now.";
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-heading-2 text-dark-900">Orders</h1>
        <p className="mt-1 text-body text-dark-700">Purchase history for your orders.</p>
      </header>

      {loadError ? (
        <section className="rounded-xl border border-light-300 bg-light-100 p-6">
          <p className="text-body text-red-600">Order history is unavailable right now: {loadError}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <form action={retryOrdersAction}>
              <button
                type="submit"
                className="rounded-full bg-dark-900 px-5 py-2 text-body text-light-100 hover:bg-dark-700"
              >
                Retry
              </button>
            </form>
            <Link
              href="/products"
              className="inline-block rounded-full border border-light-300 px-5 py-2 text-body text-dark-900 hover:border-dark-500"
            >
              Shop now
            </Link>
          </div>
        </section>
      ) : paidOrders.length === 0 ? (
        <section className="rounded-xl border border-light-300 bg-light-100 p-6">
          <p className="text-body text-dark-700">You do not have any orders yet.</p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-full border border-light-300 px-5 py-2 text-body text-dark-900 hover:border-dark-500"
          >
            Shop now
          </Link>
        </section>
      ) : (
        <section className="space-y-4">
          {paidOrders.map((order) => (
            <article key={order.id} className="rounded-xl border border-light-300 bg-light-100 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-body-medium text-dark-900">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-caption text-dark-700">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <p className="text-body-medium text-dark-900">{formatTHBFromCents(order.totalAmountCents)}</p>
              </div>

              <div className="mt-4 space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-light-300 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-md bg-light-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl ?? "/shoes/shoe-5.avif"}
                          alt={item.productName}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-body text-dark-900">{item.productName}</p>
                        <p className="text-caption text-dark-700">
                          Qty {item.quantity} · {formatTHBFromCents(item.unitAmountCents)} each
                        </p>
                      </div>
                    </div>
                    <p className="text-body-medium text-dark-900">{formatTHBFromCents(item.lineAmountCents)}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
