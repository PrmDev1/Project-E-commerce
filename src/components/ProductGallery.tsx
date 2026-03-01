"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { useVariantStore } from "@/store/variant";

type Variant = {
  color: string;
  images: string[];
};

export interface ProductGalleryProps {
  productId: string;
  variants: Variant[];
  initialVariantIndex?: number;
  className?: string;
}

function isValidSrc(src: string | undefined | null) {
  return typeof src === "string" && src.trim().length > 0;
}

export default function ProductGallery({
  productId,
  variants,
  initialVariantIndex = 0,
  className = "",
}: ProductGalleryProps) {
  const validVariants = useMemo(
    () => variants.filter((v) => Array.isArray(v.images) && v.images.some(isValidSrc)),
    [variants]
  );

  const variantIndex =
    useVariantStore(
      (s) => s.selectedByProduct[productId] ?? Math.min(initialVariantIndex, Math.max(validVariants.length - 1, 0))
    );

  const images = validVariants[variantIndex]?.images?.filter(isValidSrc) ?? [];
  const [brokenImages, setBrokenImages] = useState<Record<string, true>>({});
  const safeImages = images.filter((src) => !brokenImages[src]);
  const [activeState, setActiveState] = useState<{ variantIndex: number; activeIndex: number }>({
    variantIndex,
    activeIndex: 0,
  });
  const activeIndex =
    activeState.variantIndex === variantIndex
      ? Math.min(activeState.activeIndex, Math.max(safeImages.length - 1, 0))
      : 0;
  const mainRef = useRef<HTMLDivElement>(null);

  const setIndex = useCallback(
    (next: number | ((current: number) => number)) => {
      setActiveState((prev) => {
        const current = prev.variantIndex === variantIndex ? prev.activeIndex : 0;
        const resolved = typeof next === "function" ? next(current) : next;
        return { variantIndex, activeIndex: resolved };
      });
    },
    [variantIndex]
  );

  const go = useCallback(
    (dir: -1 | 1) => {
      if (safeImages.length === 0) return;
      setIndex((i) => (i + dir + safeImages.length) % safeImages.length);
    },
    [safeImages.length, setIndex]
  );

  const handleImageError = useCallback((src: string) => {
    setBrokenImages((prev) => (prev[src] ? prev : { ...prev, [src]: true }));
  }, [setBrokenImages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!mainRef.current) return;
      if (!document.activeElement) return;
      if (!mainRef.current.contains(document.activeElement)) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <section className={`flex w-full flex-col gap-4 lg:flex-row ${className}`}>
      <div className="order-2 flex gap-3 overflow-x-auto lg:order-1 lg:flex-col">
        {safeImages.map((src, i) => (
          <button
            key={`${src}-${i}`}
            aria-label={`Thumbnail ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg ring-1 ring-light-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-dark-500] ${i === activeIndex ? "ring-[--color-dark-500]" : ""}`}
          >
            <Image
              src={src}
              alt={`Thumbnail ${i + 1}`}
              fill
              sizes="64px"
              className="object-cover"
              onError={() => handleImageError(src)}
            />
          </button>
        ))}
      </div>

      <div ref={mainRef} className="order-1 relative w-full h-[500px] overflow-hidden rounded-xl bg-light-200 lg:order-2">
        {safeImages.length > 0 ? (
          <>
            <Image
              src={safeImages[activeIndex]}
              alt="Product image"
              fill
              sizes="(min-width:1024px) 720px, 100vw"
              className="object-cover"
              priority
              onError={() => handleImageError(safeImages[activeIndex])}
            />

            <div className="absolute inset-0 flex items-center justify-between px-2">
              <button
                aria-label="Previous image"
                onClick={() => go(-1)}
                className="rounded-full bg-light-100/80 p-2 ring-1 ring-light-300 transition hover:bg-light-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-dark-500]"
              >
                <ChevronLeft className="h-5 w-5 text-dark-900" />
              </button>
              <button
                aria-label="Next image"
                onClick={() => go(1)}
                className="rounded-full bg-light-100/80 p-2 ring-1 ring-light-300 transition hover:bg-light-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-dark-500]"
              >
                <ChevronRight className="h-5 w-5 text-dark-900" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-dark-700">
            <div className="flex items-center gap-2 rounded-lg border border-light-300 bg-light-100 px-4 py-3">
              <ImageOff className="h-5 w-5" />
              <span className="text-body">No images available</span>
            </div>
          </div>
        )}
      </div>

    </section>
  );
}
