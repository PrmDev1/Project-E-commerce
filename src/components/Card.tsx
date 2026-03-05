"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type BadgeTone = "red" | "green" | "orange";

export interface CardProps {
  title: string;
  description?: string;
  subtitle?: string;
  meta?: string | string[];
  imageSrc: string;
  imageAlt?: string;
  price?: string | number;
  href?: string;
  badge?: { label: string; tone?: BadgeTone };
  className?: string;
}

const toneToBg: Record<BadgeTone, string> = {
  red: "text-[--color-red]",
  green: "text-[--color-green]",
  orange: "text-[--color-orange]",
};

export default function Card({
  title,
  description,
  subtitle,
  meta,
  imageSrc,
  imageAlt = title,
  price,
  href,
  badge,
  className = "",
}: CardProps) {
  const [resolvedImageSrc, setResolvedImageSrc] = useState(imageSrc);

  useEffect(() => {
    setResolvedImageSrc(imageSrc);
  }, [imageSrc]);

  const displayPrice =
    price === undefined
      ? undefined
      : typeof price === "number"
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "THB" }).format(price)
        : price;
  const content = (
    <article
      className={`group rounded-xl bg-light-100 ring-1 ring-light-300 transition-colors hover:ring-dark-500 ${className}`}
    >
      <div className="relative aspect-square overflow-hidden rounded-t-xl bg-light-200">
        {badge && (
          <span
            className={`absolute left-3 top-3 z-10 rounded-full bg-light-100 px-2.5 py-1 text-caption ${toneToBg[badge.tone ?? "orange"]}`}
          >
            {badge.label}
          </span>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedImageSrc}
          alt={imageAlt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setResolvedImageSrc("/shoes/shoe-5.avif")}
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <h3 className="text-heading-3 text-dark-900">{title}</h3>
          {displayPrice && <span className="text-body-medium text-dark-900">{displayPrice}</span>}
        </div>
        {description && <p className="text-body text-dark-700">{description}</p>}
        {subtitle && <p className="text-body text-dark-700">{subtitle}</p>}
        {meta && (
          <p className="mt-1 text-caption text-dark-700">
            {Array.isArray(meta) ? meta.join(" • ") : meta}
          </p>
        )}
      </div>
    </article>
  );

  return href ? (
    <Link
      href={href}
      aria-label={title}
      className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-dark-500]"
    >
      {content}
    </Link>
  ) : (
    content
  );
}
