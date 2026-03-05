"use server";

import { backendAuthRequest, getBackendCurrentUser, readResponseBody } from "@/lib/auth/backend";

export type AdminUser = {
  userid: string;
  username: string;
  email: string;
  role: string;
};

export type AdminOrderItem = {
  itemid: string;
  productid: string;
  productname: string;
  quantity: number;
  size: string;
  price: number;
};

export type AdminUserOrder = {
  orderid: string;
  addressid: string;
  totalamount: number;
  status: string;
  datetime: string;
  items: AdminOrderItem[];
};

export type AdminUserWithHistory = {
  userid: string;
  username: string;
  email: string;
  order_history: AdminUserOrder[];
};

export type UpdateAdminUserInput = {
  userid: string;
  username: string;
  email: string;
  role: string;
};

function parseErrorMessage(json: Record<string, unknown> | null, fallback: string) {
  if (json && typeof json.message === "string" && json.message.trim().length > 0) {
    return json.message;
  }
  return fallback;
}

async function ensureAdminSession() {
  const currentUser = await getBackendCurrentUser();

  if (!currentUser?.id) {
    throw new Error("Please sign in before using admin functions");
  }

  if (currentUser.role === "admin") {
    return;
  }

  const verifyResponse = await backendAuthRequest("/api/users/all-users", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (verifyResponse.status === 401 || verifyResponse.status === 403) {
    throw new Error("Admin permission required");
  }
}

function normalizeAdminUser(input: Record<string, unknown>): AdminUser | null {
  const userid = input.userid;
  const username = input.username;
  const email = input.email;
  const role = input.role;

  if (typeof userid !== "string" || userid.trim().length === 0) return null;
  if (typeof username !== "string") return null;
  if (typeof email !== "string") return null;
  if (typeof role !== "string") return null;

  return { userid, username, email, role };
}

export async function getAllUsersForAdmin(): Promise<AdminUser[]> {
  await ensureAdminSession();

  const response = await backendAuthRequest("/api/users/all-users", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const { json } = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(parseErrorMessage(json, "Unable to load users"));
  }

  const rows = (json?.users ?? []) as unknown;
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => normalizeAdminUser((row ?? {}) as Record<string, unknown>))
    .filter((row): row is AdminUser => row !== null);
}

export async function updateUserProfileByAdmin(
  input: UpdateAdminUserInput,
): Promise<{ ok: boolean; user?: AdminUser; error?: string }> {
  await ensureAdminSession();

  const response = await backendAuthRequest("/api/users/edit-profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(input),
  });

  const { json, text } = await readResponseBody(response);

  if (!response.ok) {
    return {
      ok: false,
      error: parseErrorMessage(json, text || "Unable to update user"),
    };
  }

  const user = normalizeAdminUser(((json?.user ?? {}) as Record<string, unknown>));

  if (!user) {
    return { ok: false, error: "Backend returned invalid user data" };
  }

  return { ok: true, user };
}

function normalizeHistoryOrderItem(input: Record<string, unknown>): AdminOrderItem | null {
  const itemid = input.itemid;
  const productid = input.productid;
  const productname = input.productname;
  const quantity = Number(input.quantity ?? 0);
  const size = input.size;
  const price = Number(input.price ?? 0);

  if (typeof itemid !== "string") return null;
  if (typeof productid !== "string") return null;
  if (typeof productname !== "string") return null;
  if (!Number.isFinite(quantity)) return null;
  if (typeof size !== "string") return null;
  if (!Number.isFinite(price)) return null;

  return { itemid, productid, productname, quantity, size, price };
}

function normalizeHistoryOrder(input: Record<string, unknown>): AdminUserOrder | null {
  const orderid = input.orderid;
  const addressid = input.addressid;
  const totalamount = Number(input.totalamount ?? 0);
  const status = input.status;
  const datetime = input.datetime;
  const itemsRaw = input.items;

  if (typeof orderid !== "string") return null;
  if (typeof addressid !== "string") return null;
  if (!Number.isFinite(totalamount)) return null;
  if (typeof status !== "string") return null;
  if (typeof datetime !== "string") return null;

  const items = Array.isArray(itemsRaw)
    ? itemsRaw
        .map((item) => normalizeHistoryOrderItem((item ?? {}) as Record<string, unknown>))
        .filter((item): item is AdminOrderItem => item !== null)
    : [];

  return { orderid, addressid, totalamount, status, datetime, items };
}

function normalizeUserWithHistory(input: Record<string, unknown>): AdminUserWithHistory | null {
  const userid = input.userid;
  const username = input.username;
  const email = input.email;
  const historyRaw = input.order_history;

  if (typeof userid !== "string") return null;
  if (typeof username !== "string") return null;
  if (typeof email !== "string") return null;

  const order_history = Array.isArray(historyRaw)
    ? historyRaw
        .map((order) => normalizeHistoryOrder((order ?? {}) as Record<string, unknown>))
        .filter((order): order is AdminUserOrder => order !== null)
    : [];

  return { userid, username, email, order_history };
}

export async function getAllUsersOrderHistoryForAdmin(): Promise<AdminUserWithHistory[]> {
  await ensureAdminSession();

  const response = await backendAuthRequest("/api/users/history", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const { json } = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(parseErrorMessage(json, "Unable to load users order history"));
  }

  const rows = (json?.users ?? []) as unknown;
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => normalizeUserWithHistory((row ?? {}) as Record<string, unknown>))
    .filter((row): row is AdminUserWithHistory => row !== null);
}
