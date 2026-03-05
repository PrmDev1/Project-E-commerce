"use client";

import { useFormStatus } from "react-dom";

export default function RetryHistoryButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-light-300 px-4 py-2 text-body text-dark-900 hover:border-dark-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Retrying..." : "Retry"}
    </button>
  );
}
