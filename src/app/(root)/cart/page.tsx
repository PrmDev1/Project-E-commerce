import Link from "next/link";
import CartPageClient from "@/components/CartPageClient";
import { getCart } from "@/lib/actions/cart";

export default async function CartPage() {
  const cart = await getCart();

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <nav className="py-4 text-caption text-dark-700">
        <Link href="/" className="hover:underline">Home</Link> / <span className="text-dark-900">Cart</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-heading-2 text-dark-900">My Bag</h1>
      </header>

      <CartPageClient initialCart={cart} />
    </main>
  );
}
