"use server";

import { backendAuthRequest, getBackendCurrentUser, readResponseBody } from "@/lib/auth/backend";

type BackendCartItem = {
  cartid?: string;
  cartId?: string;
};

type BackendAddress = {
  addressid?: string;
  addressId?: string;
  id?: string;
};

async function getFirstAddressIdFromUsersApi(): Promise<string | null> {
  const response = await backendAuthRequest("/api/users/addresses", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return null;
  }

  const { json } = await readResponseBody(response);
  const addresses = (json?.addresses ?? []) as unknown;
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return null;
  }

  const first = addresses[0] as BackendAddress;
  const addressId = first.addressid ?? first.addressId ?? first.id;
  return typeof addressId === "string" && addressId.trim().length > 0 ? addressId.trim() : null;
}

function getErrorMessage(json: Record<string, unknown> | null, fallback: string) {
  if (json && typeof json.message === "string" && json.message.trim().length > 0) {
    return json.message;
  }
  return fallback;
}

async function getCartIds(userId: string): Promise<string[]> {
  const cartResponse = await backendAuthRequest(`/api/cart/get-cart/${encodeURIComponent(userId)}`, {
    method: "GET",
  });

  if (!cartResponse.ok) {
    return [];
  }

  const { json } = await readResponseBody(cartResponse);
  const cartRows = (json?.cart ?? []) as unknown;
  if (!Array.isArray(cartRows)) return [];

  const ids = new Set<string>();
  for (const row of cartRows as BackendCartItem[]) {
    const id = row.cartid ?? row.cartId;
    if (typeof id === "string" && id.trim().length > 0) {
      ids.add(id.trim());
    }
  }

  return Array.from(ids);
}

async function getFirstAddressId(userId: string, cartIds: string[]): Promise<string | null> {
  const fromUsersApi = await getFirstAddressIdFromUsersApi();
  if (fromUsersApi) {
    return fromUsersApi;
  }

  const tryPost = await backendAuthRequest("/api/cart/checkout-details", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ userId, cartIds }),
  });

  const postBody = await readResponseBody(tryPost);

  if (!tryPost.ok && tryPost.status !== 404 && tryPost.status !== 405) {
    return null;
  }

  const fallbackGet =
    tryPost.ok
      ? null
      : await backendAuthRequest("/api/cart/checkout-details", {
          method: "GET",
          headers: { Accept: "application/json" },
        });

  const getBody = fallbackGet ? await readResponseBody(fallbackGet) : null;

  const payload = tryPost.ok ? postBody.json : getBody?.json;
  const addresses = (payload?.checkoutData as Record<string, unknown> | undefined)?.availableAddresses as unknown;

  if (!Array.isArray(addresses) || addresses.length === 0) {
    return null;
  }

  const first = addresses[0] as BackendAddress;
  const addressId = first.addressid ?? first.addressId ?? first.id;
  return typeof addressId === "string" && addressId.trim().length > 0 ? addressId.trim() : null;
}

export async function createStripeCheckoutSession(cartId: string): Promise<{ url: string }> {
  void cartId;
  const user = await getBackendCurrentUser();
  if (!user?.id) {
    throw new Error("Please sign in before checkout");
  }

  const cartIds = await getCartIds(user.id);
  if (cartIds.length === 0) {
    throw new Error("Cannot checkout with an empty cart");
  }

  const addressId = await getFirstAddressId(user.id, cartIds);
  if (!addressId) {
    throw new Error("Please add a shipping address before checkout");
  }

  const createOrderResponse = await backendAuthRequest("/api/cart/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      userId: user.id,
      addressId,
      cartIds,
    }),
  });

  const { json } = await readResponseBody(createOrderResponse);

  if (!createOrderResponse.ok) {
    throw new Error(getErrorMessage(json, "Unable to create order"));
  }

  const orderId = typeof json?.orderId === "string" ? json.orderId : "";
  const url = orderId ? `/checkout/success?backend_order_id=${encodeURIComponent(orderId)}` : "/checkout/success";

  return { url };
}
