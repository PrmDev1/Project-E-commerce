"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
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

function toCents(value: string | number | null) {
  if (value === null) return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
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
