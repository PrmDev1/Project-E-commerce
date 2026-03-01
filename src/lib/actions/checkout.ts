"use server";

import { and, eq, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  cartItems,
  carts,
  colors,
  guests,
  productVariants,
  products,
  sizes,
} from "@/lib/db/schema";
import { stripe } from "@/lib/stripe/client";
import { mergeSessionsIfNeeded } from "@/lib/utils/mergeSessions";

type CheckoutCartItem = {
  variantId: string;
  quantity: number;
  unitAmountCents: number;
  productName: string;
  colorName: string | null;
  sizeName: string | null;
};

const GUEST_COOKIE = "guest_session";

function toCents(value: string | number | null) {
  if (value === null) return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

async function getActor() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.id) {
    return { userId: session.user.id, guestId: null as string | null };
  }

  const token = (await cookies()).get(GUEST_COOKIE)?.value;
  if (!token) {
    return { userId: null as string | null, guestId: null as string | null };
  }

  const guest = await db
    .select({ id: guests.id })
    .from(guests)
    .where(eq(guests.sessionToken, token))
    .limit(1);

  return {
    userId: null as string | null,
    guestId: guest[0]?.id ?? null,
  };
}

async function getCheckoutCart(cartId: string): Promise<CheckoutCartItem[]> {
  const rows = await db
    .select({
      variantId: productVariants.id,
      quantity: cartItems.quantity,
      price: productVariants.price,
      salePrice: productVariants.salePrice,
      productName: products.name,
      colorName: colors.name,
      sizeName: sizes.name,
    })
    .from(cartItems)
    .innerJoin(productVariants, eq(productVariants.id, cartItems.productVariantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .leftJoin(colors, eq(colors.id, productVariants.colorId))
    .leftJoin(sizes, eq(sizes.id, productVariants.sizeId))
    .where(eq(cartItems.cartId, cartId));

  return rows
    .filter((row) => row.quantity > 0)
    .map((row) => ({
      variantId: row.variantId,
      quantity: row.quantity,
      unitAmountCents: row.salePrice === null ? toCents(row.price) : toCents(row.salePrice),
      productName: row.productName,
      colorName: row.colorName,
      sizeName: row.sizeName,
    }))
    .filter((row) => row.unitAmountCents > 0);
}

function getOriginFromHeaders(headerStore: Headers) {
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  if (!host) {
    throw new Error("Unable to resolve request host");
  }

  return `${proto}://${host}`;
}

export async function createStripeCheckoutSession(cartId: string): Promise<{ url: string }> {
  if (!cartId) {
    throw new Error("Cart ID is required");
  }

  await mergeSessionsIfNeeded();

  const actor = await getActor();
  const ownerPredicate = actor.userId
    ? eq(carts.userId, actor.userId)
    : actor.guestId
      ? eq(carts.guestId, actor.guestId)
      : sql`false`;

  const ownerCart = await db
    .select({ id: carts.id, userId: carts.userId })
    .from(carts)
    .where(and(eq(carts.id, cartId), ownerPredicate))
    .limit(1);

  if (ownerCart.length === 0) {
    throw new Error("Cart not found or not accessible");
  }

  const cartItemsForCheckout = await getCheckoutCart(cartId);

  if (cartItemsForCheckout.length === 0) {
    throw new Error("Cannot checkout with an empty cart");
  }

  const headerStore = await headers();
  const origin = getOriginFromHeaders(headerStore);
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cartItemsForCheckout.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: "usd",
      unit_amount: item.unitAmountCents,
      product_data: {
        name: item.productName,
        description: [item.colorName, item.sizeName].filter(Boolean).join(" · ") || undefined,
      },
    },
  }));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,
    metadata: {
      cartId,
      userId: ownerCart[0].userId ?? "",
    },
  });

  if (!session.url) {
    throw new Error("Stripe session URL was not generated");
  }

  return { url: session.url };
}
