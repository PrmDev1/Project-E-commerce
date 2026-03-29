"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setDefaultAddress } from "@/lib/actions/profile";
import type { AddressItem } from "@/lib/actions/address";

type Props = {
  address: AddressItem;
  isDefault: boolean;
};

export default function AddressCard({ address, isDefault }: Props) {
  const [isPending, startTransition] = useTransition();
  const [defaultError, setDefaultError] = useState("");
  const [markedDefault, setMarkedDefault] = useState(isDefault);

  const handleSetDefault = () => {
    setDefaultError("");
    startTransition(async () => {
      const result = await setDefaultAddress(address.id);
      if (result.ok) {
        setMarkedDefault(true);
      } else {
        setDefaultError(result.error ?? "Unable to set default");
      }
    });
  };

  return (
    <article className="rounded-xl border border-light-300 bg-light-100 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-body-medium text-dark-900">{address.name}</p>
          <p className="mt-0.5 text-body text-dark-700">{address.number}</p>
          <p className="text-body text-dark-700">
            {address.locality}, {address.district}, {address.province}{" "}
            {address.postCode}
          </p>
          {address.note && (
            <p className="mt-1 text-caption text-dark-700">
              Note: {address.note}
            </p>
          )}
          {markedDefault && (
            <span className="mt-2 inline-block rounded-full bg-light-200 px-3 py-0.5 text-footnote text-dark-700">
              Default
            </span>
          )}
        </div>
      </div>

      {defaultError && (
        <p role="alert" className="mt-2 text-footnote text-red-600">
          {defaultError}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/manage-addresses/edit/${address.id}`}
          className="rounded-full border border-light-300 px-4 py-1.5 text-caption text-dark-900 transition-colors hover:border-dark-500"
        >
          Edit Address
        </Link>
        {!markedDefault && (
          <button
            type="button"
            onClick={handleSetDefault}
            disabled={isPending}
            className="rounded-full border border-light-300 px-4 py-1.5 text-caption text-dark-900 transition-colors hover:border-dark-500 disabled:opacity-40"
          >
            {isPending ? "Setting…" : "Set as Default"}
          </button>
        )}
      </div>
    </article>
  );
}
