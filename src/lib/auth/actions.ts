"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { guests } from "@/lib/db/schema/index";
import { and, eq, lt } from "drizzle-orm";
import { randomUUID } from "crypto";
import { mergeGuestCartToUser } from "@/lib/actions/cart";
import {
  applyBackendResponseCookies,
  backendAuthRequest,
  getBackendCurrentUser,
  readResponseBody,
} from "@/lib/auth/backend";

export type AuthActionResult = {
  ok: boolean;
  userId?: string;
  error?: string;
};

const COOKIE_OPTIONS = {
  httpOnly: true as const,
  secure: true as const,
  sameSite: "strict" as const,
  path: "/" as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

const emailSchema = z.string().email();
const passwordSchema = z.string().min(8).max(128);
const usernameSchema = z.string().min(3).max(100);
const roleSchema = z.enum(["user", "admin"]);
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: string) => UUID_REGEX.test(value);

export async function createGuestSession() {
  const cookieStore = await cookies();
  const existing = (await cookieStore).get("guest_session");
  if (existing?.value) {
    return { ok: true, sessionToken: existing.value };
  }

  const sessionToken = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + COOKIE_OPTIONS.maxAge * 1000);

  await db.insert(guests).values({
    sessionToken,
    expiresAt,
  });

  (await cookieStore).set("guest_session", sessionToken, COOKIE_OPTIONS);
  return { ok: true, sessionToken };
}

export async function guestSession() {
  const cookieStore = await cookies();
  const token = (await cookieStore).get("guest_session")?.value;
  if (!token) {
    return { sessionToken: null };
  }
  const now = new Date();
  await db
    .delete(guests)
    .where(and(eq(guests.sessionToken, token), lt(guests.expiresAt, now)));

  return { sessionToken: token };
}

const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  role: roleSchema,
});

export async function signUp(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    username: (formData.get("username") ?? formData.get("name")) as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: (formData.get("role") ?? "user") as string,
  };

  const parsed = signUpSchema.safeParse(rawData);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid sign-up input" };
  }

  const data = parsed.data;

  try {
    const registerEndpoints = ["/api/users/register", "/api/auth/register"];
    let response: Response | null = null;

    for (const endpoint of registerEndpoints) {
      const candidate = await backendAuthRequest(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password,
          role: data.role,
        }),
      });

      if (candidate.status === 404) {
        continue;
      }

      response = candidate;
      break;
    }

    if (!response) {
      return { ok: false, error: "Sign-up endpoint not found on backend" };
    }

    await applyBackendResponseCookies(response);

    if (!response.ok) {
      const { json, text } = await readResponseBody(response);
      const backendMessage =
        (typeof json?.message === "string" && json.message) ||
        (typeof json?.error === "string" && json.error) ||
        text ||
        `Register failed (${response.status})`;

      return { ok: false, error: backendMessage };
    }

    const { json } = await readResponseBody(response);
    const userId =
      (json?.user as Record<string, unknown> | undefined)?.id ??
      ((json?.data as Record<string, unknown> | undefined)?.user as Record<string, unknown> | undefined)
        ?.id ??
      json?.id;

    if (typeof userId === "string" && userId.length > 0) {
      await migrateGuestToUser(userId);
      return { ok: true, userId };
    }

    const sessionUser = await getBackendCurrentUser();
    if (sessionUser?.id) {
      await migrateGuestToUser(sessionUser.id);
      return { ok: true, userId: sessionUser.id };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Cannot connect to auth backend" };
  }
}

const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export async function signIn(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const parsed = signInSchema.safeParse(rawData);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid sign-in input" };
  }

  const data = parsed.data;

  try {
    const loginEndpoints = ["/api/users/login", "/api/auth/login"];
    let response: Response | null = null;

    for (const endpoint of loginEndpoints) {
      const candidate = await backendAuthRequest(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      if (candidate.status === 404) {
        continue;
      }

      response = candidate;
      break;
    }

    if (!response) {
      return { ok: false, error: "Sign-in endpoint not found on backend" };
    }

    await applyBackendResponseCookies(response);

    if (!response.ok) {
      const { json, text } = await readResponseBody(response);
      const message =
        (typeof json?.message === "string" && json.message) ||
        (typeof json?.error === "string" && json.error) ||
        text ||
        `Sign in failed (${response.status})`;

      return { ok: false, error: message };
    }

    const sessionUser = await getBackendCurrentUser();
    if (sessionUser?.id) {
      await migrateGuestToUser(sessionUser.id);
      return { ok: true, userId: sessionUser.id };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Cannot connect to auth backend" };
  }
}

export async function getCurrentUser() {
  try {
    return await getBackendCurrentUser();
  } catch (e) {
    console.log(e);
    return null;
  }
}

export async function signOut() {
  const logoutEndpoints = ["/api/users/logout", "/api/auth/logout"];

  for (const endpoint of logoutEndpoints) {
    const response = await backendAuthRequest(endpoint, { method: "POST" });

    if (response.status === 404) {
      continue;
    }

    await applyBackendResponseCookies(response);
    break;
  }

  const cookieStore = await cookies();
  cookieStore.delete("token");

  return { ok: true };
}

export async function mergeGuestCartWithUserCart() {
  const session = await getBackendCurrentUser();

  if (session?.id) {
    await migrateGuestToUser(session.id);
  }

  return { ok: true };
}

async function migrateGuestToUser(userId: string) {
  if (!isUuid(userId)) {
    return;
  }

  await mergeGuestCartToUser(userId);

  const cookieStore = await cookies();
  const token = cookieStore.get("guest_session")?.value;
  if (!token) return;

  await db.delete(guests).where(eq(guests.sessionToken, token));
  cookieStore.delete("guest_session");
}
