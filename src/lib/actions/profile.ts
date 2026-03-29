"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { backendAuthRequest, readResponseBody } from "@/lib/auth/backend";

export type ProfileUpdateInput = {
  username: string;
};

export async function updateProfile(
  input: ProfileUpdateInput
): Promise<{ ok: boolean; error?: string }> {
  const username = input.username.trim();

  if (!username) {
    return { ok: false, error: "Username is required" };
  }

  const response = await backendAuthRequest("/api/users/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ username }),
  });

  const { json, text } = await readResponseBody(response);

  if (!response.ok) {
    return {
      ok: false,
      error:
        typeof json?.message === "string"
          ? json.message
          : text || "Unable to update profile",
    };
  }

  // Update JWT cookie so Navbar/profile reflect the new username immediately
  if (typeof json?.token === "string") {
    const cookieStore = await cookies();
    cookieStore.set("token", json.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60,
      path: "/",
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export type AddressUpdateInput = {
  name: string;
  number: string;
  province: string;
  district: string;
  locality: string;
  postCode: string;
  note?: string;
};

export async function updateAddress(
  addressId: string,
  input: AddressUpdateInput
): Promise<{ ok: boolean; error?: string }> {
  if (!addressId) {
    return { ok: false, error: "Address ID is required" };
  }
  if (!input.name.trim() || !input.number.trim()) {
    return { ok: false, error: "Recipient name and address line are required" };
  }

  const response = await backendAuthRequest(
    `/api/users/address/${addressId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: input.name.trim(),
        number: input.number.trim(),
        province: input.province.trim(),
        district: input.district.trim(),
        locality: input.locality.trim(),
        postCode: input.postCode.trim(),
        note: input.note?.trim() ?? "",
      }),
    }
  );

  const { json, text } = await readResponseBody(response);

  if (!response.ok) {
    return {
      ok: false,
      error:
        typeof json?.message === "string"
          ? json.message
          : text || "Unable to update address",
    };
  }

  revalidatePath("/manage-addresses");
  revalidatePath("/addresses");
  revalidatePath("/cart");
  return { ok: true };
}

export async function setDefaultAddress(
  addressId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!addressId) {
    return { ok: false, error: "Address ID is required" };
  }

  const response = await backendAuthRequest(
    `/api/users/set-default-address/${addressId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );

  const { json, text } = await readResponseBody(response);

  if (!response.ok) {
    return {
      ok: false,
      error:
        typeof json?.message === "string"
          ? json.message
          : text || "Unable to set default address",
    };
  }

  revalidatePath("/manage-addresses");
  revalidatePath("/addresses");
  revalidatePath("/cart");
  return { ok: true };
}
