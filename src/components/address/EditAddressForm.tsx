"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateAddress } from "@/lib/actions/profile";
import type { AddressItem } from "@/lib/actions/address";

type Props = {
  address: AddressItem;
};

export default function EditAddressForm({ address }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [fields, setFields] = useState({
    name: address.name,
    number: address.number,
    province: address.province,
    district: address.district,
    locality: address.locality,
    postCode: address.postCode,
    note: address.note,
  });

  const isDirty =
    fields.name !== address.name ||
    fields.number !== address.number ||
    fields.province !== address.province ||
    fields.district !== address.district ||
    fields.locality !== address.locality ||
    fields.postCode !== address.postCode ||
    fields.note !== address.note;

  const setField = (key: keyof typeof fields) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFields((prev) => ({ ...prev, [key]: e.target.value }));
    setStatus("idle");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("idle");
    setErrorMsg("");

    startTransition(async () => {
      const result = await updateAddress(address.id, {
        name: fields.name,
        number: fields.number,
        province: fields.province,
        district: fields.district,
        locality: fields.locality,
        postCode: fields.postCode,
        note: fields.note,
      });

      if (result.ok) {
        setStatus("success");
        setTimeout(() => router.push("/manage-addresses"), 1200);
      } else {
        setStatus("error");
        setErrorMsg(result.error ?? "Unable to update address");
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border border-light-300 bg-light-100 p-6"
    >
      <div className="space-y-4">
        {/* Recipient Name */}
        <div>
          <label
            className="mb-1 block text-caption text-dark-700"
            htmlFor="edit-name"
          >
            Recipient name
          </label>
          <input
            id="edit-name"
            type="text"
            value={fields.name}
            onChange={setField("name")}
            required
            autoComplete="name"
            className="w-full rounded-lg border border-light-300 bg-light-100 px-3 py-2.5 text-body text-dark-900 transition-colors focus:border-dark-500 focus:outline-none"
          />
        </div>

        {/* Address Line */}
        <div>
          <label
            className="mb-1 block text-caption text-dark-700"
            htmlFor="edit-number"
          >
            Address line
          </label>
          <input
            id="edit-number"
            type="text"
            value={fields.number}
            onChange={setField("number")}
            required
            autoComplete="street-address"
            className="w-full rounded-lg border border-light-300 bg-light-100 px-3 py-2.5 text-body text-dark-900 transition-colors focus:border-dark-500 focus:outline-none"
          />
        </div>

        {/* Province + District */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              className="mb-1 block text-caption text-dark-700"
              htmlFor="edit-province"
            >
              Province
            </label>
            <input
              id="edit-province"
              type="text"
              value={fields.province}
              onChange={setField("province")}
              required
              autoComplete="address-level1"
              className="w-full rounded-lg border border-light-300 bg-light-100 px-3 py-2.5 text-body text-dark-900 transition-colors focus:border-dark-500 focus:outline-none"
            />
          </div>
          <div>
            <label
              className="mb-1 block text-caption text-dark-700"
              htmlFor="edit-district"
            >
              District
            </label>
            <input
              id="edit-district"
              type="text"
              value={fields.district}
              onChange={setField("district")}
              required
              autoComplete="address-level2"
              className="w-full rounded-lg border border-light-300 bg-light-100 px-3 py-2.5 text-body text-dark-900 transition-colors focus:border-dark-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Locality + Post Code */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              className="mb-1 block text-caption text-dark-700"
              htmlFor="edit-locality"
            >
              Locality
            </label>
            <input
              id="edit-locality"
              type="text"
              value={fields.locality}
              onChange={setField("locality")}
              required
              autoComplete="address-level3"
              className="w-full rounded-lg border border-light-300 bg-light-100 px-3 py-2.5 text-body text-dark-900 transition-colors focus:border-dark-500 focus:outline-none"
            />
          </div>
          <div>
            <label
              className="mb-1 block text-caption text-dark-700"
              htmlFor="edit-postcode"
            >
              Post code
            </label>
            <input
              id="edit-postcode"
              type="text"
              value={fields.postCode}
              onChange={setField("postCode")}
              required
              autoComplete="postal-code"
              className="w-full rounded-lg border border-light-300 bg-light-100 px-3 py-2.5 text-body text-dark-900 transition-colors focus:border-dark-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label
            className="mb-1 block text-caption text-dark-700"
            htmlFor="edit-note"
          >
            Note (optional)
          </label>
          <textarea
            id="edit-note"
            value={fields.note}
            onChange={setField("note")}
            rows={3}
            className="w-full rounded-lg border border-light-300 bg-light-100 px-3 py-2.5 text-body text-dark-900 transition-colors focus:border-dark-500 focus:outline-none"
          />
        </div>
      </div>

      {status === "success" && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-light-300 bg-light-200 px-4 py-3 text-body text-dark-900"
        >
          Address updated. Redirecting…
        </p>
      )}
      {status === "error" && (
        <p role="alert" className="mt-4 text-body text-red-600">
          {errorMsg}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={!isDirty || isPending}
          aria-disabled={!isDirty || isPending}
          className="flex-1 rounded-full bg-dark-900 px-6 py-3 text-body-medium text-light-100 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/manage-addresses")}
          disabled={isPending}
          className="flex-1 rounded-full border border-light-300 px-6 py-3 text-body text-dark-900 transition-colors hover:border-dark-500 disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
