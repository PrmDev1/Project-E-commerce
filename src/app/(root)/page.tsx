import React from "react";
import Card from "@/components/Card";
import { getAllProducts } from "@/lib/actions/product";

function formatTHB(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
  }).format(value);
}

const Home = async () => {
  const { products } = await getAllProducts({ limit: 6 });

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <section aria-labelledby="latest" className="pb-12">
        <h2 id="latest" className="mb-6 text-heading-2 text-dark-900">
          Latest Shoes
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
      </section>
    </main>
  );
};

export default Home;
