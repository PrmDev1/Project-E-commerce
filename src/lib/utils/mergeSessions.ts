"use server";

import { mergeGuestCartWithUserCart } from "@/lib/auth/actions";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function mergeSessionsIfNeeded() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return;
  }

  await mergeGuestCartWithUserCart();
}
