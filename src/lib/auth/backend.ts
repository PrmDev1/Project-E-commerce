import { cookies } from "next/headers";

export type BackendSessionUser = {
  id: string;
  email?: string;
  username?: string;
  name?: string;
  role?: string;
  image?: string;
};

type JwtPayload = {
  id?: string;
  name?: string;
  username?: string;
  role?: string;
  email?: string;
  exp?: number;
};

type BackendUserListItem = {
  userid?: string;
  id?: string;
  username?: string;
  name?: string;
  email?: string;
  role?: string;
};

type ParsedSetCookie = {
  name: string;
  value: string;
  options: {
    path?: string;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: "strict" | "lax" | "none";
    maxAge?: number;
    expires?: Date;
  };
};

function splitSetCookieHeader(setCookieValue: string): string[] {
  const entries: string[] = [];
  let current = "";
  let inExpires = false;

  for (let index = 0; index < setCookieValue.length; index += 1) {
    const char = setCookieValue[index];

    if (char === ",") {
      if (inExpires) {
        current += char;
        continue;
      }

      entries.push(current.trim());
      current = "";
      continue;
    }

    current += char;

    const lowerCurrent = current.toLowerCase();
    if (lowerCurrent.endsWith("expires=")) {
      inExpires = true;
      continue;
    }

    if (inExpires && char === ";") {
      inExpires = false;
    }
  }

  if (current.trim()) {
    entries.push(current.trim());
  }

  return entries;
}

function parseSetCookie(setCookie: string): ParsedSetCookie | null {
  const parts = setCookie.split(";").map((part) => part.trim());
  const [nameValue, ...attributes] = parts;

  if (!nameValue) return null;

  const separatorIndex = nameValue.indexOf("=");
  if (separatorIndex <= 0) return null;

  const name = nameValue.slice(0, separatorIndex).trim();
  const value = nameValue.slice(separatorIndex + 1).trim();

  const options: ParsedSetCookie["options"] = {};

  for (const attribute of attributes) {
    const [rawKey, ...rawValueParts] = attribute.split("=");
    const key = rawKey?.trim().toLowerCase();
    const rawValue = rawValueParts.join("=").trim();

    if (!key) continue;

    if (key === "path" && rawValue) {
      options.path = rawValue;
      continue;
    }

    if (key === "domain" && rawValue) {
      options.domain = rawValue;
      continue;
    }

    if (key === "secure") {
      options.secure = true;
      continue;
    }

    if (key === "httponly") {
      options.httpOnly = true;
      continue;
    }

    if (key === "samesite" && rawValue) {
      const sameSite = rawValue.toLowerCase();
      if (sameSite === "strict" || sameSite === "lax" || sameSite === "none") {
        options.sameSite = sameSite;
      }
      continue;
    }

    if (key === "max-age" && rawValue) {
      const maxAge = Number(rawValue);
      if (Number.isFinite(maxAge)) {
        options.maxAge = maxAge;
      }
      continue;
    }

    if (key === "expires" && rawValue) {
      const expires = new Date(rawValue);
      if (!Number.isNaN(expires.getTime())) {
        options.expires = expires;
      }
    }
  }

  return { name, value, options };
}

function getSetCookieValues(headersStore: Headers): string[] {
  const headersWithSetCookie = headersStore as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headersWithSetCookie.getSetCookie === "function") {
    const values = headersWithSetCookie.getSetCookie();
    if (values.length > 0) return values;
  }

  const combined = headersStore.get("set-cookie");
  if (!combined) return [];
  return splitSetCookieHeader(combined);
}

async function buildCookieHeader() {
  const cookieStore = await cookies();
  const requestCookies = cookieStore.getAll();
  if (requestCookies.length === 0) {
    return undefined;
  }

  return requestCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

export async function backendAuthRequest(path: string, init: RequestInit = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const backendBaseUrl = process.env.NEXT_PUBLIC_AUTH_BACKEND_URL ?? "http://localhost:5000";
  const url = `${backendBaseUrl}${normalizedPath}`;
  const requestCookieHeader = await buildCookieHeader();

  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (requestCookieHeader && !headers.has("Cookie")) {
    headers.set("Cookie", requestCookieHeader);
  }

  return fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function applyBackendResponseCookies(response: Response) {
  const setCookieValues = getSetCookieValues(response.headers);
  if (setCookieValues.length === 0) return;

  const cookieStore = await cookies();

  for (const setCookie of setCookieValues) {
    const parsed = parseSetCookie(setCookie);
    if (!parsed) continue;

    cookieStore.set(parsed.name, parsed.value, {
      path: parsed.options.path ?? "/",
      domain: parsed.options.domain,
      secure: parsed.options.secure,
      httpOnly: parsed.options.httpOnly,
      sameSite: parsed.options.sameSite,
      maxAge: parsed.options.maxAge,
      expires: parsed.options.expires,
    });
  }
}

export async function readResponseBody(response: Response) {
  const raw = await response.text();
  if (!raw) return { json: null as Record<string, unknown> | null, text: "" };

  try {
    return { json: JSON.parse(raw) as Record<string, unknown>, text: raw };
  } catch {
    return { json: null as Record<string, unknown> | null, text: raw };
  }
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = `${normalized}${"=".repeat(padLength)}`;
  return Buffer.from(padded, "base64").toString("utf8");
}

async function getUserFromJwtCookie(): Promise<BackendSessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payloadText = decodeBase64Url(parts[1]);
    const payload = JSON.parse(payloadText) as JwtPayload;

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    if (!payload.id || typeof payload.id !== "string") {
      return null;
    }

    return {
      id: payload.id,
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
      username: typeof payload.username === "string" ? payload.username : undefined,
      role: typeof payload.role === "string" ? payload.role : undefined,
    };
  } catch {
    return null;
  }
}

async function hydrateRoleIfMissing(user: BackendSessionUser): Promise<BackendSessionUser> {
  if (user.role) {
    return user;
  }

  const response = await backendAuthRequest("/api/users/all-users", {
    method: "GET",
  });

  if (!response.ok) {
    return user;
  }

  const { json } = await readResponseBody(response);
  const users = (json?.users ?? []) as unknown;
  if (!Array.isArray(users)) {
    return user;
  }

  const found = (users as BackendUserListItem[]).find((item) => {
    const itemId = item.userid ?? item.id;
    if (itemId && itemId === user.id) return true;
    if (user.email && item.email && item.email === user.email) return true;
    if (user.username && item.username && item.username === user.username) return true;
    if (user.name && item.name && item.name === user.name) return true;
    return false;
  });

  if (!found?.role) {
    return user;
  }

  return {
    ...user,
    role: found.role,
  };
}

export async function getBackendCurrentUser(): Promise<BackendSessionUser | null> {
  const fromJwtCookie = await getUserFromJwtCookie();
  if (fromJwtCookie) {
    return hydrateRoleIfMissing(fromJwtCookie);
  }

  const sessionEndpoints = ["/api/users/me", "/api/users/profile", "/api/users/session"];

  for (const endpoint of sessionEndpoints) {
    const response = await backendAuthRequest(endpoint, { method: "GET" });

    if (response.status === 404) {
      continue;
    }

    if (response.status === 401 || response.status === 403) {
      return null;
    }

    if (!response.ok) {
      continue;
    }

    const { json } = await readResponseBody(response);

    const candidate =
      (json?.user as Record<string, unknown> | undefined) ??
      ((json?.data as Record<string, unknown> | undefined)?.user as
        | Record<string, unknown>
        | undefined) ??
      json;

    if (!candidate || typeof candidate !== "object") {
      return null;
    }

    const id = candidate.id;
    if (typeof id !== "string" || id.length === 0) {
      return null;
    }

    const sessionUser = {
      id,
      email: typeof candidate.email === "string" ? candidate.email : undefined,
      username: typeof candidate.username === "string" ? candidate.username : undefined,
      name: typeof candidate.name === "string" ? candidate.name : undefined,
      role: typeof candidate.role === "string" ? candidate.role : undefined,
      image: typeof candidate.image === "string" ? candidate.image : undefined,
    };

    return hydrateRoleIfMissing(sessionUser);
  }

  return null;
}

export async function getBackendIsAdmin(): Promise<boolean> {
  const user = await getBackendCurrentUser();
  if (!user?.id) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  const response = await backendAuthRequest("/api/users/all-users", {
    method: "GET",
  });

  return response.status === 200;
}
