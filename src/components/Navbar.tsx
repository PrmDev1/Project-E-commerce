"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { getCart } from "@/lib/actions/cart";
import { signOut } from "@/lib/auth/actions";
import { useCartStore } from "@/store/cart.store";

const NAV_LINKS = [
  { label: "Shoes", href: "/products" },
  { label: "Men", href: "/products?gender=men" },
  { label: "Women", href: "/products?gender=women" },
  { label: "Kid", href: "/products?gender=unisex" },
  { label: "Orders", href: "/orders" },
] as const;

type NavbarUser = {
  name?: string;
  username?: string;
  email?: string;
  role?: string;
};

export default function Navbar({
  showAdminLink = false,
  currentUser = null,
}: {
  showAdminLink?: boolean;
  currentUser?: NavbarUser | null;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const profileDropdownRef = useRef<HTMLDetailsElement | null>(null);
  const router = useRouter();
  const itemCount = useCartStore((state) => state.itemCount);
  const setCart = useCartStore((state) => state.setCart);

  useEffect(() => {
    startTransition(async () => {
      const cart = await getCart();
      setCart(cart);
    });
  }, [setCart]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const dropdown = profileDropdownRef.current;
      if (!dropdown?.open) return;

      const target = event.target as Node | null;
      if (target && !dropdown.contains(target)) {
        dropdown.open = false;
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  const cartLabel = `My Cart (${itemCount})`;
  const profileName = currentUser?.name ?? currentUser?.username ?? currentUser?.email ?? "User";
  const profileRole = currentUser?.role ?? "unknown";
  const profileEmail = currentUser?.email ?? "-";

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut();
      window.location.href = "/sign-in";
    });
  };

  const handleSearch = (formData: FormData) => {
    const keyword = String(formData.get("search") ?? "").trim();
    const target = keyword ? `/products?search=${encodeURIComponent(keyword)}` : "/products";
    router.push(target);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-light-100">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Primary"
      >
        <Link href="/" aria-label="Nike Home" className="flex items-center">
          <Image src="/logo.svg" alt="Nike" width={28} height={28} priority className="invert" />
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="text-body text-dark-900 transition-colors hover:text-dark-700"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-5 md:flex">
          <form action={handleSearch} className="relative">
            <input
              name="search"
              type="text"
              placeholder="Search"
              className="w-44 rounded-full border border-light-300 bg-light-200 py-2 pl-10 pr-3 text-body text-dark-900"
            />
            <button
              type="submit"
              aria-label="Search products"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-700 hover:text-dark-900"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </form>
          <Link href="/cart" className="text-body text-dark-900 transition-colors hover:text-dark-700">
            {isPending ? "My Cart" : cartLabel}
          </Link>
          {showAdminLink && (
            <Link href="/admin" className="text-body text-dark-900 transition-colors hover:text-dark-700">
              Admin
            </Link>
          )}
          {currentUser ? (
            <details ref={profileDropdownRef} className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-light-300 px-3 py-1.5 text-caption text-dark-900 hover:border-dark-500">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-light-200 text-dark-900">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
                    <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                <span className="text-body text-dark-900">Profile</span>
              </summary>
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-light-300 bg-light-100 p-3 shadow-sm">
                <p className="text-body-medium text-dark-900">{profileName}</p>
                <p className="text-caption text-dark-700">{profileEmail}</p>
                <p className="mt-1 text-caption text-dark-700">Role: {profileRole}</p>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-3 w-full rounded-full border border-light-300 px-3 py-2 text-caption text-dark-900 hover:border-dark-500"
                >
                  Sign out
                </button>
              </div>
            </details>
          ) : (
            <Link href="/sign-in" className="text-body text-dark-900 transition-colors hover:text-dark-700">
              Sign In
            </Link>
          )}
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 md:hidden"
          aria-controls="mobile-menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Toggle navigation</span>
          <span className="mb-1 block h-0.5 w-6 bg-dark-900"></span>
          <span className="mb-1 block h-0.5 w-6 bg-dark-900"></span>
          <span className="block h-0.5 w-6 bg-dark-900"></span>
        </button>
      </nav>

      <div
        id="mobile-menu"
        className={`border-t border-light-300 md:hidden ${open ? "block" : "hidden"}`}
      >
        <ul className="space-y-2 px-4 py-3">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="block py-2 text-body text-dark-900 hover:text-dark-700"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            </li>
          ))}
          {showAdminLink && (
            <li>
              <Link
                href="/admin"
                className="block py-2 text-body text-dark-900 hover:text-dark-700"
                onClick={() => setOpen(false)}
              >
                Admin
              </Link>
            </li>
          )}
          <li className="pt-2">
            <form action={handleSearch} className="relative">
              <input
                name="search"
                type="text"
                placeholder="Search"
                className="w-full rounded-full border border-light-300 bg-light-200 py-2 pl-10 pr-3 text-body text-dark-900"
              />
              <button
                type="submit"
                aria-label="Search products"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-700"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </form>
          </li>
          <li className="flex items-center justify-between pt-2">
            <Link href="/cart" className="text-body" onClick={() => setOpen(false)}>
              {isPending ? "My Cart" : cartLabel}
            </Link>
          </li>
          {showAdminLink && (
            <li>
              <Link
                href="/admin"
                className="block py-2 text-body text-dark-900 hover:text-dark-700"
                onClick={() => setOpen(false)}
              >
                Admin
              </Link>
            </li>
          )}
          {currentUser ? (
            <li className="pt-2 text-body text-dark-900">
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-light-200 text-dark-900">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
                    <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                <p className="text-body-medium">Profile</p>
              </div>
              <p>{profileName}</p>
              <p className="text-caption text-dark-700">{profileEmail}</p>
              <p className="text-caption text-dark-700">Role: {profileRole}</p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  handleSignOut();
                }}
                className="mt-2 rounded-full border border-light-300 px-3 py-1 text-caption text-dark-900"
              >
                Sign out
              </button>
            </li>
          ) : (
            <li>
              <Link
                href="/sign-in"
                className="block py-2 text-body text-dark-900 hover:text-dark-700"
                onClick={() => setOpen(false)}
              >
                Sign In
              </Link>
            </li>
          )}
        </ul>
      </div>
    </header>
  );
}
