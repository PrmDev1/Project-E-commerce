import Link from "next/link";
import { Suspense } from "react";
import Card from "@/components/Card";
import CollapsibleSection from "@/components/CollapsibleSection";
import ProductGallery from "@/components/ProductGallery";
import SizePicker from "@/components/SizePicker";
import { Heart, Star } from "lucide-react";
import ColorSwatches from "@/components/ColorSwatches";
import AddToCartButton from "@/components/AddToCartButton";
import { getProduct, getProductReviews, getRecommendedProducts, type Review, type RecommendedProduct } from "@/lib/actions/product";

type GalleryVariant = { color: string; images: string[] };

function formatPrice(price: number | null | undefined) {
  if (price === null || price === undefined) return undefined;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
  }).format(price);
}

function NotFoundBlock() {
  return (
    <section className="mx-auto max-w-3xl rounded-xl border border-light-300 bg-light-100 p-8 text-center">
      <h1 className="text-heading-3 text-dark-900">Product not found</h1>
      <p className="mt-2 text-body text-dark-700">The product you’re looking for doesn’t exist or may have been removed.</p>
      <div className="mt-6">
        <Link
          href="/products"
          className="inline-block rounded-full bg-dark-900 px-6 py-3 text-body-medium text-light-100 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-dark-500]"
        >
          Browse Products
        </Link>
      </div>
    </section>
  );
}

async function ReviewsSection({ productId }: { productId: string }) {
  const reviews: Review[] = await getProductReviews(productId);
  const count = reviews.length;
  const avg = count > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / count : 0;

  return (
    <CollapsibleSection
      title={`Reviews (${count})`}
      rightMeta={
        <span className="flex items-center gap-1 text-dark-900">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className={`h-4 w-4 ${i <= Math.round(avg) ? "fill-[--color-dark-900]" : ""}`} />
          ))}
        </span>
      }
    >
      <ul className="space-y-4">
        {reviews.slice(0, 10).map((review) => {
          const isLong = review.content.length > 220;

          return (
            <li key={review.id} className="rounded-lg border border-light-300 p-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-body-medium text-dark-900">{review.author}</p>
                <span className="flex items-center gap-1" aria-label={`Rated ${review.rating} out of 5`}>
                  {[1, 2, 3, 4, 5].map((index) => (
                    <Star
                      key={index}
                      className={`h-4 w-4 ${index <= review.rating ? "fill-[--color-dark-900]" : ""}`}
                    />
                  ))}
                </span>
              </div>
              {review.title && <p className="text-body-medium text-dark-900">{review.title}</p>}

              {isLong ? (
                <details className="mt-1">
                  <summary className="cursor-pointer text-body text-dark-700 marker:text-dark-500">
                    {review.content.slice(0, 180)}...
                  </summary>
                  <p className="mt-2 text-body text-dark-700">{review.content}</p>
                </details>
              ) : (
                <p className="mt-1 text-body text-dark-700">{review.content}</p>
              )}

              <p className="mt-2 text-caption text-dark-700">{new Date(review.createdAt).toLocaleDateString()}</p>
            </li>
          );
        })}
      </ul>
    </CollapsibleSection>
  );
}

async function AlsoLikeSection({ productId }: { productId: string }) {
  const recs: RecommendedProduct[] = await getRecommendedProducts(productId);
  if (!recs.length) return null;
  return (
    <section className="mt-16">
      <h2 className="mb-6 text-heading-3 text-dark-900">You Might Also Like</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {recs.map((p) => (
          <Card
            key={p.id}
            title={p.title}
            imageSrc={p.imageUrl}
            price={p.price ?? undefined}
            href={`/products/${p.id}`}
          />
        ))}
      </div>
    </section>
  );
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="py-4 text-caption text-dark-700">
          <Link href="/" className="hover:underline">Home</Link> / <Link href="/products" className="hover:underline">Products</Link> /{" "}
          <span className="text-dark-900">Not found</span>
        </nav>
        <NotFoundBlock />
      </main>
    );
  }

  const galleryVariants: GalleryVariant[] = product.variants
    .map((variant) => ({
      color: variant.color?.name || "Default",
      images: (variant.images.length > 0 ? variant.images : product.genericImages).map((image) => image.url),
    }))
    .filter((variant) => variant.images.some((image) => image.trim().length > 0));

  const discount =
    product.comparePrice && product.price && product.comparePrice > product.price
      ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
      : null;

  const subtitle = product.subtitle;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <nav className="py-4 text-caption text-dark-700">
        <Link href="/" className="hover:underline">Home</Link> / <Link href="/products" className="hover:underline">Products</Link> /{" "}
        <span className="text-dark-900">{product.title}</span>
      </nav>

      <section className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_480px]">
        {galleryVariants.length > 0 && (
          <ProductGallery productId={product.id} variants={galleryVariants} className="lg:sticky lg:top-6" />
        )}

        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <h1 className="text-heading-2 text-dark-900">{product.title}</h1>
            {subtitle && <p className="text-body text-dark-700">{subtitle}</p>}
          </header>

          <div className="flex items-center gap-3">
            <p className="text-lead text-dark-900">{formatPrice(product.price)}</p>
            {product.comparePrice && (
              <>
                <span className="text-body text-dark-700 line-through">{formatPrice(product.comparePrice)}</span>
                {discount !== null && (
                  <span className="rounded-full border border-light-300 px-2 py-1 text-caption text-[--color-green]">
                    {discount}% off
                  </span>
                )}
              </>
            )}
          </div>

          <ColorSwatches productId={product.id} variants={galleryVariants} />
          <SizePicker productId={product.id} />

          <div className="flex flex-col gap-3">
            <AddToCartButton productId={product.id} variantIds={product.variants.map((variant) => variant.id)} />
            <button className="flex items-center justify-center gap-2 rounded-full border border-light-300 px-6 py-4 text-body-medium text-dark-900 transition hover:border-dark-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-dark-500]">
              <Heart className="h-5 w-5" />
              Favorite
            </button>
          </div>

          <CollapsibleSection title="Product Details" defaultOpen>
            <p>{product.description}</p>
          </CollapsibleSection>

          <CollapsibleSection title="Shipping & Returns">
            <p>Free standard shipping and free 30-day returns for Nike Members.</p>
          </CollapsibleSection>

          <Suspense
            fallback={
              <CollapsibleSection title="Reviews">
                <p className="text-body text-dark-700">Loading reviews…</p>
              </CollapsibleSection>
            }
          >
            <ReviewsSection productId={product.id} />
          </Suspense>
        </div>
      </section>

      <Suspense
        fallback={
          <section className="mt-16">
            <h2 className="mb-6 text-heading-3 text-dark-900">You Might Also Like</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-xl bg-light-200" />
              ))}
            </div>
          </section>
        }
      >
        <AlsoLikeSection productId={product.id} />
      </Suspense>
    </main>
  );
}
