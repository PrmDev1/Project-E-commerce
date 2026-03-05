"use client";

import { removeParams, setParam } from "@/lib/utils/query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

export default function Filters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = useMemo(() => `?${searchParams.toString()}`, [searchParams]);

  const applyFilters = (formData: FormData) => {
    const brand = String(formData.get("brand") ?? "").trim();
    const priceMax = String(formData.get("priceMax") ?? "").trim();

    let url = search;
    url = setParam(pathname, url, "search", searchParams.get("search") ?? null);
    url = setParam(pathname, new URL(url, "http://dummy").search, "brand", brand || null);
    url = setParam(pathname, new URL(url, "http://dummy").search, "priceMax", priceMax || null);
    url = setParam(pathname, new URL(url, "http://dummy").search, "page", "1");
    router.push(url, { scroll: false });
  };

  const clearAll = () => {
    const url = removeParams(pathname, search, [
      "brand",
      "brand[]",
      "priceMax",
      "price",
      "price[]",
      "page",
    ]);
    router.push(url, { scroll: false });
  };

  return (
    <aside className="sticky top-20 h-fit min-w-60 rounded-lg border border-light-300 bg-light-100 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-body-medium text-dark-900">Filters</h3>
        <button className="text-caption text-dark-700 underline" onClick={clearAll} type="button">
          Clear all
        </button>
      </div>

      <form
        key={searchParams.toString()}
        className="space-y-4"
        action={(formData) => {
          applyFilters(formData);
        }}
      >
        <div>
          <label htmlFor="product-brand" className="mb-1 block text-caption text-dark-700">
            Brand
          </label>
          <input
            name="brand"
            id="product-brand"
            type="text"
            placeholder="e.g. adidas"
            defaultValue={searchParams.get("brand") ?? ""}
            className="w-full rounded-md border border-light-300 bg-light-100 px-3 py-2 text-body text-dark-900"
          />
        </div>

        <div>
          <label htmlFor="product-price-max" className="mb-1 block text-caption text-dark-700">
            Max price
          </label>
          <input
            name="priceMax"
            id="product-price-max"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 5000"
            defaultValue={searchParams.get("priceMax") ?? ""}
            className="w-full rounded-md border border-light-300 bg-light-100 px-3 py-2 text-body text-dark-900"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-dark-900 px-4 py-2 text-body-medium text-light-100 hover:bg-dark-700"
        >
          Apply
        </button>
      </form>
    </aside>
  );
}
