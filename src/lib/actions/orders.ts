"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { backendAuthRequest, readResponseBody } from "@/lib/auth/backend";
import {
  cartItems,
  carts,
  orderItems,
  orders,
  payments,
  productVariants,
  products,
} from "@/lib/db/schema";
import { stripe } from "@/lib/stripe/client";

const BACKEND_BASE_URL =
  process.env.AUTH_BACKEND_URL ??
  process.env.NEXT_PUBLIC_AUTH_BACKEND_URL ??
  "http://localhost:5000";

function toCents(value: string | number | null) {
  if (value === null) return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toBackendImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  if (raw.startsWith("/uploads/")) {
    return `${BACKEND_BASE_URL}${raw}`;
  }

  if (raw.startsWith("uploads/")) {
    return `${BACKEND_BASE_URL}/${raw}`;
  }

  if (raw.startsWith("/")) {
    return `${BACKEND_BASE_URL}/uploads/${raw.replace(/^\/+/, "")}`;
  }

  return `${BACKEND_BASE_URL}/uploads/${raw}`;
}

function normalizeLegacyPaidOrder(input: Record<string, unknown>): PaidOrderHistory | null {
  const id = input.orderid;
  if (typeof id !== "string" || id.length === 0) {
    return null;
  }

  const totalAmountBaht = toNumber(input.totalamount);
  const createdAtRaw = input.datetime;
  const createdAt = createdAtRaw ? new Date(String(createdAtRaw)) : new Date();
  const safeCreatedAt = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;

  const itemsRaw = Array.isArray(input.items) ? input.items : [];
  const items = itemsRaw
    .map((rawItem) => {
      if (!rawItem || typeof rawItem !== "object") return null;
      const item = rawItem as Record<string, unknown>;
      const quantity = Math.max(1, Math.trunc(toNumber(item.quantity)));
      const unitAmountCents = Math.round(toNumber(item.price) * 100);
      const productId = typeof item.productid === "string" ? item.productid : "";

      return {
        id: typeof item.itemid === "string" && item.itemid.length > 0 ? item.itemid : `${id}-${productId || "item"}`,
        productId: productId || "unknown-product",
        productName: typeof item.productname === "string" ? item.productname : "Unknown product",
        imageUrl: toBackendImageUrl(item.productimage),
        quantity,
        unitAmountCents,
        lineAmountCents: unitAmountCents * quantity,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    id,
    status: "paid",
    totalAmountCents: Math.round(totalAmountBaht * 100),
    createdAt: safeCreatedAt,
    stripeSessionId: null,
    items,
  };
}

async function getPaidOrdersFromBackendHistory(): Promise<PaidOrderHistory[]> {
  const response = await backendAuthRequest("/api/users/my-history", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const { json, text } = await readResponseBody(response);

  if (!response.ok) {
    const message =
      typeof json?.message === "string" && json.message.trim().length > 0
        ? json.message
        : text || `Unable to load order history (status ${response.status})`;
    throw new Error(message);
  }

  const rows = (json?.orders ?? []) as unknown;
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => normalizeLegacyPaidOrder((row ?? {}) as Record<string, unknown>))
    .filter((row): row is PaidOrderHistory => row !== null);
}

export async function createOrder(stripeSessionId: string, userId?: string) {
  if (!stripeSessionId) {
    throw new Error("stripeSessionId is required");
  }

  const existing = await db
    .select({ orderId: payments.orderId })
    .from(payments)
    .where(and(eq(payments.method, "stripe"), eq(payments.transactionId, stripeSessionId)))
    .limit(1);

  if (existing.length > 0) {
    return { orderId: existing[0].orderId, created: false };
  }

  const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
  if (session.status !== "complete" || session.payment_status !== "paid") {
    throw new Error("Checkout session is not paid");
  }

  const cartId = session.metadata?.cartId;
  const metadataUserId = session.metadata?.userId || undefined;

  if (!cartId) {
    throw new Error("Missing cartId in Stripe session metadata");
  }

  const cart = await db
    .select({ id: carts.id, userId: carts.userId })
    .from(carts)
    .where(eq(carts.id, cartId))
    .limit(1);

  if (cart.length === 0) {
    throw new Error("Cart not found for checkout session");
  }

  const cartRows = await db
    .select({
      variantId: productVariants.id,
      quantity: cartItems.quantity,
      price: productVariants.price,
      salePrice: productVariants.salePrice,
    })
    .from(cartItems)
    .innerJoin(productVariants, eq(productVariants.id, cartItems.productVariantId))
    .where(eq(cartItems.cartId, cartId));

  if (cartRows.length === 0) {
    throw new Error("Cannot create order for empty cart");
  }

  const normalizedItems = cartRows
    .filter((item) => item.quantity > 0)
    .map((item) => {
      const unitAmountCents = item.salePrice === null ? toCents(item.price) : toCents(item.salePrice);
      return {
        variantId: item.variantId,
        quantity: item.quantity,
        unitAmountCents,
        lineAmountCents: unitAmountCents * item.quantity,
      };
    })
    .filter((item) => item.unitAmountCents > 0);

  if (normalizedItems.length === 0) {
    throw new Error("No valid line items found for order creation");
  }

  const totalAmountCents = normalizedItems.reduce((sum, item) => sum + item.lineAmountCents, 0);

  const createdOrder = await db
    .insert(orders)
    .values({
      userId: userId ?? metadataUserId ?? cart[0].userId ?? null,
      status: "paid",
      totalAmount: String(totalAmountCents),
    })
    .returning({ id: orders.id });

  const orderId = createdOrder[0].id;

  await db.insert(orderItems).values(
    normalizedItems.map((item) => ({
      orderId,
      productVariantId: item.variantId,
      quantity: item.quantity,
      priceAtPurchase: String(item.unitAmountCents),
    })),
  );

  await db.insert(payments).values({
    orderId,
    method: "stripe",
    status: "completed",
    paidAt: new Date(),
    transactionId: stripeSessionId,
  });

  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));

  return { orderId, created: true };
}

export async function getOrder(orderId: string) {
  const orderRows = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
      paymentTransactionId: payments.transactionId,
    })
    .from(orders)
    .leftJoin(payments, eq(payments.orderId, orders.id))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (orderRows.length === 0) {
    return null;
  }

  const itemRows = await db
    .select({
      id: orderItems.id,
      quantity: orderItems.quantity,
      priceAtPurchase: orderItems.priceAtPurchase,
      productId: products.id,
      productName: products.name,
      imageUrl: sql<string | null>`(
        select pi.url
        from product_images pi
        where pi.product_id = ${products.id}
          and (pi.variant_id = ${orderItems.productVariantId} or pi.variant_id is null)
        order by
          case when pi.variant_id = ${orderItems.productVariantId} then 0 else 1 end,
          pi.is_primary desc,
          pi.sort_order asc
        limit 1
      )`,
    })
    .from(orderItems)
    .innerJoin(productVariants, eq(productVariants.id, orderItems.productVariantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(orderItems.orderId, orderId));

  return {
    id: orderRows[0].id,
    status: orderRows[0].status,
    totalAmountCents: Math.round(Number(orderRows[0].totalAmount)),
    createdAt: orderRows[0].createdAt,
    stripeSessionId: orderRows[0].paymentTransactionId,
    items: itemRows.map((item) => {
      const unitAmountCents = Math.round(Number(item.priceAtPurchase));
      return {
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
        unitAmountCents,
        lineAmountCents: unitAmountCents * item.quantity,
      };
    }),
  };
}

export async function getOrderByStripeSessionId(stripeSessionId: string) {
  if (!stripeSessionId) {
    return null;
  }

  const payment = await db
    .select({ orderId: payments.orderId })
    .from(payments)
    .where(and(eq(payments.method, "stripe"), eq(payments.transactionId, stripeSessionId)))
    .limit(1);

  if (payment.length === 0) {
    return null;
  }

  return getOrder(payment[0].orderId);
}

export type PaidOrderHistory = {
  id: string;
  status: "paid" | "pending" | "shipped" | "delivered" | "cancelled";
  totalAmountCents: number;
  createdAt: Date;
  stripeSessionId: string | null;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    imageUrl: string | null;
    quantity: number;
    unitAmountCents: number;
    lineAmountCents: number;
  }>;
};

export async function getPaidOrdersByUserId(userId: string): Promise<PaidOrderHistory[]> {
  if (!userId) {
    return [];
  }

  if (!isUuid(userId)) {
    return getPaidOrdersFromBackendHistory();
  }

  try {
    const orderRows = await db
      .select({
        id: orders.id,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.status, "paid")))
      .orderBy(desc(orders.createdAt));

    if (orderRows.length === 0) {
      return getPaidOrdersFromBackendHistory();
    }

    const hydrated = await Promise.all(orderRows.map((order) => getOrder(order.id)));

    return hydrated
      .filter((order): order is NonNullable<typeof order> => order !== null)
      .map((order) => ({
        id: order.id,
        status: order.status,
        totalAmountCents: order.totalAmountCents,
        createdAt: order.createdAt,
        stripeSessionId: order.stripeSessionId,
        items: order.items,
      }));
  } catch {
    return getPaidOrdersFromBackendHistory();
  }
}
