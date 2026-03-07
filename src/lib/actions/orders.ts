"use server";

import { backendAuthRequest, readResponseBody } from "@/lib/auth/backend";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_AUTH_BACKEND_URL ?? "http://localhost:5000";

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

function normalizeOrderStatus(value: unknown): PaidOrderHistory["status"] {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "paid" || raw === "pending" || raw === "shipped" || raw === "delivered" || raw === "cancelled") {
    return raw;
  }
  if (raw === "success" || raw === "completed") {
    return "paid";
  }
  return "pending";
}

function normalizeLegacyOrder(input: Record<string, unknown>): PaidOrderHistory | null {
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
        id:
          typeof item.itemid === "string" && item.itemid.length > 0
            ? item.itemid
            : `${id}-${productId || "item"}`,
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
    status: normalizeOrderStatus(input.status),
    totalAmountCents: Math.round(totalAmountBaht * 100),
    createdAt: safeCreatedAt,
    stripeSessionId: null,
    items,
  };
}

export async function getPaidOrdersByUserId(userId: string): Promise<PaidOrderHistory[]> {
  if (!userId) {
    return [];
  }

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
    .map((row) => normalizeLegacyOrder((row ?? {}) as Record<string, unknown>))
    .filter((row): row is PaidOrderHistory => row !== null);
}
