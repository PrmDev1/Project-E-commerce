"use server";

import { revalidatePath } from "next/cache";
import { backendAuthRequest, getBackendCurrentUser, readResponseBody } from "@/lib/auth/backend";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_BACKEND_URL ?? "http://localhost:5000";

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

type BackendCartRow = {
  cartid?: string;
  cartId?: string;
  productid?: string;
  productId?: string;
  quantity?: number | string;
  size?: string;
  productname?: string;
  productName?: string;
  productimage?: string;
  productImage?: string;
  productbrand?: string;
  productBrand?: string;
  price?: number | string;
  subtotal?: number | string;
  itemtotal?: number | string;
  stock?: number | string;
};

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toImageUrl(image?: string | null) {
  if (!image) return null;
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  if (image.startsWith("/")) return `${BACKEND_BASE_URL}${image}`;
  return `${BACKEND_BASE_URL}/uploads/${image}`;
}

function normalizeBackendCart(rows: BackendCartRow[], isAuthenticated: boolean): CartView {
  const items: CartItemView[] = rows.map((row, index) => {
    const cartItemId = String(row.cartid ?? row.cartId ?? `cart-item-${index}`);
    const productId = String(row.productid ?? row.productId ?? "");
    const quantity = Math.max(1, Math.floor(toNumber(row.quantity, 1)));
    const unitPrice = toNumber(row.price, 0);
    const lineTotal =
      row.subtotal !== undefined || row.itemtotal !== undefined
        ? toNumber(row.subtotal ?? row.itemtotal, unitPrice * quantity)
        : unitPrice * quantity;

    const productTitle = String(row.productname ?? row.productName ?? "Untitled Product");
    const brand = String(row.productbrand ?? row.productBrand ?? "").trim();
    const size = row.size ? String(row.size) : null;

    return {
      cartItemId,
      quantity,
      variantId: productId ? `${productId}-default` : cartItemId,
      sku: productId || cartItemId,
      inStock: Math.max(0, Math.floor(toNumber(row.stock, 999))),
      unitPrice,
      lineTotal: Number(lineTotal.toFixed(2)),
      productId,
      productTitle,
      productSubtitle: brand ? `${brand} Shoes` : "Shoes",
      imageUrl: toImageUrl(row.productimage ?? row.productImage ?? null),
      colorName: null,
      sizeName: size,
    };
  });

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  const cartId = items[0]?.cartItemId ?? null;

  return {
    cartId,
    isAuthenticated,
    items,
    itemCount,
    total,
  };
}

async function readBackendCart(userId: string): Promise<CartView> {
  const response = await backendAuthRequest(`/api/cart/get-cart/${encodeURIComponent(userId)}`, {
    method: "GET",
  });

  if (!response.ok) {
    return {
      cartId: null,
      isAuthenticated: true,
      items: [],
      itemCount: 0,
      total: 0,
    };
  }

  const { json } = await readResponseBody(response);
  const rows = (json?.cart ?? []) as unknown;
  return normalizeBackendCart(Array.isArray(rows) ? (rows as BackendCartRow[]) : [], true);
}

function extractProductId(productVariantId: string) {
  if (!productVariantId) return "";
  if (productVariantId.endsWith("-default")) {
    return productVariantId.slice(0, -"-default".length);
  }
  return productVariantId;
}

export async function getCart(): Promise<CartView> {
  const user = await getBackendCurrentUser();
  if (!user?.id) {
    return {
      cartId: null,
      isAuthenticated: false,
      items: [],
      itemCount: 0,
      total: 0,
    };
  }

  return readBackendCart(user.id);
}

export async function addCartItem(input: {
  productVariantId: string;
  quantity?: number;
  size?: string;
}): Promise<CartView> {
  const user = await getBackendCurrentUser();
  if (!user?.id) {
    return {
      cartId: null,
      isAuthenticated: false,
      items: [],
      itemCount: 0,
      total: 0,
    };
  }

  const productId = extractProductId(input.productVariantId);
  const selectedSize = String(input.size ?? "").trim();
  if (!productId) {
    return readBackendCart(user.id);
  }

  if (!selectedSize) {
    return readBackendCart(user.id);
  }

  await backendAuthRequest("/api/cart/add-to-cart", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      userId: user.id,
      productId,
      quantity: Math.max(1, Math.floor(input.quantity ?? 1)),
      size: selectedSize,
    }),
  });

  revalidatePath("/cart");
  return readBackendCart(user.id);
}

export async function updateCartItem(input: {
  cartItemId: string;
  quantity: number;
  productVariantId?: string;
}): Promise<CartView> {
  const user = await getBackendCurrentUser();
  if (!user?.id) {
    return {
      cartId: null,
      isAuthenticated: false,
      items: [],
      itemCount: 0,
      total: 0,
    };
  }

  const quantity = Math.max(0, Math.floor(input.quantity));

  if (quantity === 0) {
    await backendAuthRequest(`/api/cart/delete-from-cart/${encodeURIComponent(input.cartItemId)}`, {
      method: "DELETE",
    });
  } else {
    await backendAuthRequest(`/api/cart/update-cart/${encodeURIComponent(input.cartItemId)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ quantity }),
    });
  }

  revalidatePath("/cart");
  return readBackendCart(user.id);
}

export async function removeCartItem(input: { cartItemId: string }): Promise<CartView> {
  const user = await getBackendCurrentUser();
  if (!user?.id) {
    return {
      cartId: null,
      isAuthenticated: false,
      items: [],
      itemCount: 0,
      total: 0,
    };
  }

  await backendAuthRequest(`/api/cart/delete-from-cart/${encodeURIComponent(input.cartItemId)}`, {
    method: "DELETE",
  });

  revalidatePath("/cart");
  return readBackendCart(user.id);
}

export async function clearCart(): Promise<CartView> {
  const user = await getBackendCurrentUser();
  if (!user?.id) {
    return {
      cartId: null,
      isAuthenticated: false,
      items: [],
      itemCount: 0,
      total: 0,
    };
  }

  const current = await readBackendCart(user.id);
  await Promise.all(
    current.items.map((item) =>
      backendAuthRequest(`/api/cart/delete-from-cart/${encodeURIComponent(item.cartItemId)}`, {
        method: "DELETE",
      })
    )
  );

  revalidatePath("/cart");
  return readBackendCart(user.id);
}

export async function mergeGuestCartToUser(userId: string): Promise<void> {
  void userId;
  return;
}
