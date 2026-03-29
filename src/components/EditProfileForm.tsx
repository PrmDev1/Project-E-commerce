"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/lib/actions/profile";
import type { AddressItem } from "@/lib/actions/address";

type Props = {
  initialUsername: string;
  primaryAddress: AddressItem | null;
};

export default function EditProfileForm({ initialUsername, primaryAddress }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const isDirty = username !== initialUsername;

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setStatus("idle");
    setErrorMsg("");

    startTransition(async () => {
      const result = await updateProfile({ username });
      if (result.ok) {
        setStatus("success");
        router.refresh();
      } else {
        setStatus("error");
        setErrorMsg(result.error ?? "Unable to update profile");
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-light-300 bg-light-100 p-6">
        <h2 className="mb-5 text-heading-3 text-dark-900">Personal Information</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div>
            <label
              className="mb-1 block text-caption text-dark-700"
              htmlFor="profile-username"
            >
              Username
            </label>
            <input
              id="profile-username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setStatus("idle");
              }}
              required
              autoComplete="username"
              className="w-full rounded-lg border border-light-300 bg-light-100 px-3 py-2.5 text-body text-dark-900 transition-colors focus:border-dark-500 focus:outline-none"
            />
          </div>

          {status === "success" && (
            <p
              role="status"
              className="mt-4 rounded-lg border border-light-300 bg-light-200 px-4 py-3 text-body text-dark-900"
            >
              Profile updated successfully.
            </p>
          )}
          {status === "error" && (
            <p role="alert" className="mt-4 text-body text-red-600">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={!isDirty || isPending}
            aria-disabled={!isDirty || isPending}
            className="mt-5 w-full rounded-full bg-dark-900 px-6 py-3 text-body-medium text-light-100 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-light-300 bg-light-100 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-heading-3 text-dark-900">Addresses</h2>
          <Link
            href="/addresses"
            className="rounded-full border border-light-300 px-4 py-1.5 text-caption text-dark-900 transition-colors hover:border-dark-500"
          >
            Edit Addresses
          </Link>
        </div>

        {primaryAddress ? (
          <article className="mt-4 rounded-lg border border-light-300 p-4">
            <p className="text-body-medium text-dark-900">{primaryAddress.name}</p>
            <p className="text-body text-dark-700">{primaryAddress.number}</p>
            <p className="text-body text-dark-700">
              {primaryAddress.locality}, {primaryAddress.district},{" "}
              {primaryAddress.province} {primaryAddress.postCode}
            </p>
            {primaryAddress.note && (
              <p className="mt-1 text-caption text-dark-700">
                Note: {primaryAddress.note}
              </p>
            )}
          </article>
        ) : (
          <p className="mt-4 text-body text-dark-700">
            No address added yet.{" "}
            <Link href="/addresses" className="underline hover:text-dark-900">
              Add one now.
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
