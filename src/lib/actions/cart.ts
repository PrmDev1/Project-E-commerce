"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  cartItems,
  carts,
  colors,
  genders,
  guests,
  productVariants,
  products,
  sizes,
} from "@/lib/db/schema";

const GUEST_COOKIE = "guest_session";
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export type CartItemView = {
  cartItemId: string;
  quantity: number;
  variantId: string;
  sku: string;
  inStock: number;
  unitPrice: number;
  lineTotal: number;
  productId: string;
  productTitle: string;
  productSubtitle: string;
  imageUrl: string | null;
  colorName: string | null;
  sizeName: string | null;
};

export type CartView = {
  cartId: string | null;
  isAuthenticated: boolean;
  items: CartItemView[];
  itemCount: number;
  total: number;
};

type ResolvedActor =
  | { type: "user"; userId: string }
  | { type: "guest"; guestId: string };

const toNumber = (value: string | number | null) => {
  if (value === null) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

async function resolveActor(): Promise<ResolvedActor> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.id) {
    return { type: "user", userId: session.user.id };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(GUEST_COOKIE)?.value;
  const now = new Date();

  if (token) {
    const existing = await db
      .select({ id: guests.id, expiresAt: guests.expiresAt })
      .from(guests)
      .where(eq(guests.sessionToken, token))
      .limit(1);

    if (existing.length > 0 && existing[0].expiresAt > now) {
      return { type: "guest", guestId: existing[0].id };
    }

    await db.delete(guests).where(eq(guests.sessionToken, token));
  }

  const sessionToken = randomUUID();
  const expiresAt = new Date(Date.now() + GUEST_COOKIE_MAX_AGE * 1000);
  const created = await db
    .insert(guests)
    .values({ sessionToken, expiresAt })
    .returning({ id: guests.id });

  cookieStore.set(GUEST_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE,
  });

  return { type: "guest", guestId: created[0].id };
}

async function resolveOrCreateCart(actor: ResolvedActor): Promise<string> {
  const whereClause =
    actor.type === "user" ? eq(carts.userId, actor.userId) : eq(carts.guestId, actor.guestId);

  const existing = await db
    .select({ id: carts.id })
    .from(carts)
    .where(whereClause)
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  const created = await db
    .insert(carts)
    .values(actor.type === "user" ? { userId: actor.userId } : { guestId: actor.guestId })
    .returning({ id: carts.id });

  return created[0].id;
}

async function readCartItems(cartId: string): Promise<CartItemView[]> {
  const rows = await db
    .select({
      cartItemId: cartItems.id,
      quantity: cartItems.quantity,
      variantId: productVariants.id,
      sku: productVariants.sku,
      inStock: productVariants.inStock,
      price: productVariants.price,
      salePrice: productVariants.salePrice,
      productId: products.id,
      productTitle: products.name,
      genderLabel: genders.label,
      imageUrl: sql<string | null>`(
        select pi.url
        from product_images pi
        where pi.product_id = ${products.id}
          and (pi.variant_id = ${productVariants.id} or pi.variant_id is null)
        order by
          case when pi.variant_id = ${productVariants.id} then 0 else 1 end,
          pi.is_primary desc,
          pi.sort_order asc
        limit 1
      )`,
      colorName: colors.name,
      sizeName: sizes.name,
    })
    .from(cartItems)
    .innerJoin(productVariants, eq(productVariants.id, cartItems.productVariantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .leftJoin(genders, eq(genders.id, products.genderId))
    .leftJoin(colors, eq(colors.id, productVariants.colorId))
    .leftJoin(sizes, eq(sizes.id, productVariants.sizeId))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(desc(cartItems.id));

  return rows.map((row) => {
    const effectivePrice = row.salePrice === null ? toNumber(row.price) : toNumber(row.salePrice);
    return {
      cartItemId: row.cartItemId,
      quantity: row.quantity,
      variantId: row.variantId,
      sku: row.sku,
      inStock: row.inStock,
      unitPrice: effectivePrice,
      lineTotal: Number((effectivePrice * row.quantity).toFixed(2)),
      productId: row.productId,
      productTitle: row.productTitle,
      productSubtitle: row.genderLabel ? `${row.genderLabel} Shoes` : "Shoes",
      imageUrl: row.imageUrl,
      colorName: row.colorName,
      sizeName: row.sizeName,
    };
  });
}

function toCartView(
  cartId: string | null,
  isAuthenticated: boolean,
  items: CartItemView[],
): CartView {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  return { cartId, isAuthenticated, items, itemCount, total };
}

export async function getCart(): Promise<CartView> {
  const actor = await resolveActor();
  const cartId = await resolveOrCreateCart(actor);
  const items = await readCartItems(cartId);
  return toCartView(cartId, actor.type === "user", items);
}

export async function addCartItem(input: {
  productVariantId: string;
  quantity?: number;
}): Promise<CartView> {
  const actor = await resolveActor();
  const cartId = await resolveOrCreateCart(actor);
  const quantityToAdd = Math.max(1, input.quantity ?? 1);

  const existing = await db
    .select({ id: cartItems.id, quantity: cartItems.quantity })
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productVariantId, input.productVariantId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(cartItems)
      .set({ quantity: existing[0].quantity + quantityToAdd })
      .where(eq(cartItems.id, existing[0].id));
  } else {
    await db.insert(cartItems).values({
      cartId,
      productVariantId: input.productVariantId,
      quantity: quantityToAdd,
    });
  }

  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));

  const items = await readCartItems(cartId);
  const result = toCartView(cartId, actor.type === "user", items);
  revalidatePath("/cart");
  return result;
}

export async function updateCartItem(input: {
  cartItemId: string;
  quantity: number;
  productVariantId?: string;
}): Promise<CartView> {
  const actor = await resolveActor();
  const cartId = await resolveOrCreateCart(actor);
  const quantity = Math.max(0, Math.floor(input.quantity));

  const ownerItem = await db
    .select({ id: cartItems.id })
    .from(cartItems)
    .where(and(eq(cartItems.id, input.cartItemId), eq(cartItems.cartId, cartId)))
    .limit(1);

  if (ownerItem.length > 0) {
    if (quantity <= 0) {
      await db.delete(cartItems).where(eq(cartItems.id, input.cartItemId));
    } else {
      await db
        .update(cartItems)
        .set({
          quantity,
          productVariantId: input.productVariantId ?? undefined,
        })
        .where(eq(cartItems.id, input.cartItemId));
    }
  }

  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));

  const items = await readCartItems(cartId);
  const result = toCartView(cartId, actor.type === "user", items);
  revalidatePath("/cart");
  return result;
}

export async function removeCartItem(input: { cartItemId: string }): Promise<CartView> {
  const actor = await resolveActor();
  const cartId = await resolveOrCreateCart(actor);

  await db
    .delete(cartItems)
    .where(and(eq(cartItems.id, input.cartItemId), eq(cartItems.cartId, cartId)));

  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));

  const items = await readCartItems(cartId);
  const result = toCartView(cartId, actor.type === "user", items);
  revalidatePath("/cart");
  return result;
}

export async function clearCart(): Promise<CartView> {
  const actor = await resolveActor();
  const cartId = await resolveOrCreateCart(actor);

  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));

  revalidatePath("/cart");
  return toCartView(cartId, actor.type === "user", []);
}

export async function mergeGuestCartToUser(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GUEST_COOKIE)?.value;

  if (!guestToken) {
    return;
  }

  const guest = await db
    .select({ id: guests.id })
    .from(guests)
    .where(eq(guests.sessionToken, guestToken))
    .limit(1);

  if (guest.length === 0) {
    cookieStore.delete(GUEST_COOKIE);
    return;
  }

  const guestCart = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.guestId, guest[0].id))
    .limit(1);

  if (guestCart.length === 0) {
    await db.delete(guests).where(eq(guests.id, guest[0].id));
    cookieStore.delete(GUEST_COOKIE);
    return;
  }

  const userCartId = await resolveOrCreateCart({ type: "user", userId });

  const guestItems = await db
    .select({
      id: cartItems.id,
      productVariantId: cartItems.productVariantId,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .where(eq(cartItems.cartId, guestCart[0].id));

  if (guestItems.length > 0) {
    const existingInUser = await db
      .select({
        id: cartItems.id,
        productVariantId: cartItems.productVariantId,
        quantity: cartItems.quantity,
      })
      .from(cartItems)
      .where(eq(cartItems.cartId, userCartId));

    const userMap = new Map(existingInUser.map((item) => [item.productVariantId, item]));

    for (const guestItem of guestItems) {
      const match = userMap.get(guestItem.productVariantId);
      if (match) {
        await db
          .update(cartItems)
          .set({ quantity: match.quantity + guestItem.quantity })
          .where(eq(cartItems.id, match.id));
      } else {
        await db.insert(cartItems).values({
          cartId: userCartId,
          productVariantId: guestItem.productVariantId,
          quantity: guestItem.quantity,
        });
      }
    }
  }

  await db.delete(carts).where(eq(carts.id, guestCart[0].id));
  await db.delete(guests).where(eq(guests.id, guest[0].id));
  cookieStore.delete(GUEST_COOKIE);

  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, userCartId));
  revalidatePath("/cart");
}
