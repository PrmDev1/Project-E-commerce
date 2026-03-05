"use server";

import { revalidatePath } from "next/cache";
import { backendAuthRequest, getBackendCurrentUser, readResponseBody } from "@/lib/auth/backend";

type BackendAddressRow = {
  addressid?: string;
  addressId?: string;
  id?: string;
  province?: string;
  district?: string;
  locality?: string;
  postcode?: string;
  postCode?: string;
  name?: string;
  number?: string;
  note?: string;
};

export type AddressItem = {
  id: string;
  province: string;
  district: string;
  locality: string;
  postCode: string;
  name: string;
  number: string;
  note: string;
};

export type AddressInput = {
  province: string;
  district: string;
  locality: string;
  postCode: string;
  name: string;
  number: string;
  note?: string;
};

export async function getAddressesForCurrentUser(): Promise<AddressItem[]> {
  const user = await getBackendCurrentUser();
  if (!user?.id) return [];

  const response = await backendAuthRequest("/api/users/addresses", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) return [];

  const { json } = await readResponseBody(response);
  const addresses = (json?.addresses ?? []) as unknown;

  if (!Array.isArray(addresses)) return [];

  return (addresses as BackendAddressRow[])
    .map((row) => {
      const id = row.addressid ?? row.addressId ?? row.id;
      if (!id || typeof id !== "string") return null;

      return {
        id,
        province: String(row.province ?? ""),
        district: String(row.district ?? ""),
        locality: String(row.locality ?? ""),
        postCode: String(row.postCode ?? row.postcode ?? ""),
        name: String(row.name ?? ""),
        number: String(row.number ?? ""),
        note: String(row.note ?? ""),
      } satisfies AddressItem;
    })
    .filter((item): item is AddressItem => item !== null);
}

export async function addAddress(input: AddressInput): Promise<{ ok: boolean; error?: string }> {
  const response = await backendAuthRequest("/api/users/add-address", {
    method: "POST",
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
      error: typeof json?.message === "string" ? json.message : text || "Unable to add address",
    };
  }

  revalidatePath("/addresses");
  revalidatePath("/cart");
  return { ok: true };
}
