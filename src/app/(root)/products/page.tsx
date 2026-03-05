import { Card, Filters, Sort } from "@/components";
import { parseFilterParams } from "@/lib/utils/query";
import { getAllProducts } from "@/lib/actions/product";

function formatTHB(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
  }).format(value);
}

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const parsed = parseFilterParams(sp);
  const { products, totalCount } = await getAllProducts(parsed);

  const activeBadges: string[] = [];
  const searchKeyword = typeof sp.search === "string" ? sp.search : Array.isArray(sp.search) ? sp.search[0] : undefined;
  const brand = typeof sp.brand === "string" ? sp.brand : Array.isArray(sp.brand) ? sp.brand[0] : undefined;
  const gender = typeof sp.gender === "string" ? sp.gender : Array.isArray(sp.gender) ? sp.gender[0] : undefined;
  const priceMax =
    typeof sp.priceMax === "string" ? sp.priceMax : Array.isArray(sp.priceMax) ? sp.priceMax[0] : undefined;

  if (searchKeyword) {
    activeBadges.push(`Search: ${searchKeyword}`);
  }
  if (brand) {
    activeBadges.push(`Brand: ${brand}`);
  }
  if (gender) {
    activeBadges.push(`Gender: ${gender}`);
  }
  if (priceMax) {
    const parsedPriceMax = Number(priceMax);
    activeBadges.push(`Max: ${Number.isFinite(parsedPriceMax) ? formatTHB(parsedPriceMax) : `THB ${priceMax}`}`);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between py-6">
        <h1 className="text-heading-3 text-dark-900">New ({totalCount})</h1>
        <Sort />
      </header>

      {activeBadges.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {activeBadges.map((b, i) => (
            <span
              key={`${b}-${i}`}
              className="rounded-full border border-light-300 px-3 py-1 text-caption text-dark-900"
            >
              {b}
            </span>
          ))}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
        <Filters />
        <div>
          {products.length === 0 ? (
            <div className="rounded-lg border border-light-300 p-8 text-center">
              <p className="text-body text-dark-700">No products match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 pb-6">
              {products.map((p) => {
                const price =
                  p.minPrice !== null && p.maxPrice !== null && p.minPrice !== p.maxPrice
                    ? `${formatTHB(p.minPrice)} - ${formatTHB(p.maxPrice)}`
                    : p.minPrice !== null
                    ? p.minPrice
                    : undefined;
                return (
                  <Card
                    key={p.id}
                    title={p.name}
                    subtitle={p.subtitle ?? undefined}
                    imageSrc={p.imageUrl ?? "/shoes/shoe-5.avif"}
                    price={price}
                    href={`/products/${p.id}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
