"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { setParam } from "@/lib/utils/query";
import { useMemo } from "react";

const OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Featured", value: "featured" },
  { label: "Price (High → Low)", value: "price_desc" },
  { label: "Price (Low → High)", value: "price_asc" },
] as const;

export default function Sort() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = useMemo(() => `?${searchParams.toString()}`, [searchParams]);
  const selected = searchParams.get("sort") ?? searchParams.get("sortBy") ?? "newest";

  const onChange = (value: string) => {
    const withSort = setParam(pathname, search, "sort", value);
    const noLegacySortBy = setParam(pathname, new URL(withSort, "http://dummy").search, "sortBy", null);
    const withPageReset = setParam(pathname, new URL(noLegacySortBy, "http://dummy").search, "page", "1");
    router.push(withPageReset, { scroll: false });
  };

  return (
    <label className="inline-flex items-center gap-2">
      <span className="text-body text-dark-900">Sort by</span>
      <select
        className="rounded-md border border-light-300 bg-light-100 px-3 py-2 text-body"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Sort products"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
