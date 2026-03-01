"use server";

import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  brands,
  categories,
  genders,
  productImages,
  productVariants,
  products,
  sizes,
  colors,
  users,
  reviews,
} from "@/lib/db/schema";

import { NormalizedProductFilters } from "@/lib/utils/query";

type ProductListItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  createdAt: Date;
  subtitle?: string | null;
};

export type GetAllProductsResult = {
  products: ProductListItem[];
  totalCount: number;
};

export async function getAllProducts(filters: NormalizedProductFilters): Promise<GetAllProductsResult> {
  const conds: SQL[] = [eq(products.isPublished, true)];

  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conds.push(or(ilike(products.name, pattern), ilike(products.description, pattern))!);
  }

  if (filters?.genderSlugs?.length) {
    conds.push(inArray(genders.slug, filters.genderSlugs));
  }

  if (filters?.brandSlugs?.length) {
    conds.push(inArray(brands.slug, filters.brandSlugs));
  }

  if (filters?.categorySlugs?.length) {
    conds.push(inArray(categories.slug, filters.categorySlugs));
  }

  const hasSize = (filters?.sizeSlugs?.length ?? 0) > 0;
  const hasColor = (filters?.colorSlugs?.length ?? 0) > 0;
  const hasPrice = !!(filters?.priceMin !== undefined || filters?.priceMax !== undefined || filters?.priceRanges?.length);
  const sizeSlugs = filters.sizeSlugs ?? [];
  const colorSlugs = filters.colorSlugs ?? [];

  const variantConds: SQL[] = [];
  if (hasSize) {
    variantConds.push(inArray(productVariants.sizeId, db
      .select({ id: sizes.id })
      .from(sizes)
      .where(inArray(sizes.slug, sizeSlugs))));
  }
  if (hasColor) {
    variantConds.push(inArray(productVariants.colorId, db
      .select({ id: colors.id })
      .from(colors)
      .where(inArray(colors.slug, colorSlugs))));
  }
  if (hasPrice) {
    const priceBounds: SQL[] = [];
    if (filters.priceRanges?.length) {
      for (const [min, max] of filters.priceRanges) {
        const subConds: SQL[] = [];
        if (min !== undefined) {
          subConds.push(sql`(${productVariants.price})::numeric >= ${min}`);
        }
        if (max !== undefined) {
          subConds.push(sql`(${productVariants.price})::numeric <= ${max}`);
        }
        if (subConds.length) priceBounds.push(and(...subConds)!);
      }
    }
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      const subConds: SQL[] = [];
      if (filters.priceMin !== undefined) subConds.push(sql`(${productVariants.price})::numeric >= ${filters.priceMin}`);
      if (filters.priceMax !== undefined) subConds.push(sql`(${productVariants.price})::numeric <= ${filters.priceMax}`);
      if (subConds.length) priceBounds.push(and(...subConds)!);
    }
    if (priceBounds.length) {
      variantConds.push(or(...priceBounds)!);
    }
  }

  const variantJoin = db
    .select({
      variantId: productVariants.id,
      productId: productVariants.productId,
      price: sql<number>`${productVariants.price}::numeric`.as("price"),
      colorId: productVariants.colorId,
      sizeId: productVariants.sizeId,
    })
    .from(productVariants)
    .where(variantConds.length ? and(...variantConds) : undefined)
    .as("v");
  const imagesJoin = hasColor
    ? db
        .select({
          productId: productImages.productId,
          url: productImages.url,
          rn: sql<number>`row_number() over (partition by ${productImages.productId} order by ${productImages.isPrimary} desc, ${productImages.sortOrder} asc)`.as("rn"),
        })
        .from(productImages)
        .innerJoin(productVariants, eq(productVariants.id, productImages.variantId))
        .where(
          inArray(
            productVariants.colorId,
            db.select({ id: colors.id }).from(colors).where(inArray(colors.slug, colorSlugs))
          )
        )
        .as("pi")
    : db
        .select({
          productId: productImages.productId,
          url: productImages.url,
          rn: sql<number>`row_number() over (partition by ${productImages.productId} order by ${productImages.isPrimary} desc, ${productImages.sortOrder} asc)`.as("rn"),
        })
        .from(productImages)
        .where(isNull(productImages.variantId))
        .as("pi")


  const baseWhere = conds.length ? and(...conds) : undefined;

  const priceAgg = {
    minPrice: sql<number | null>`min(${variantJoin.price})`,
    maxPrice: sql<number | null>`max(${variantJoin.price})`,
  };

  const imageAgg = sql<string | null>`max(case when ${imagesJoin.rn} = 1 then ${imagesJoin.url} else null end)`;

  const primaryOrder =
    filters.sort === "price_asc"
      ? asc(sql`min(${variantJoin.price})`)
      : filters.sort === "price_desc"
      ? desc(sql`max(${variantJoin.price})`)
      : desc(products.createdAt);

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.max(1, Math.min(filters.limit ?? 60, 60));
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      createdAt: products.createdAt,
      subtitle: genders.label,
      minPrice: priceAgg.minPrice,
      maxPrice: priceAgg.maxPrice,
      imageUrl: imageAgg,
    })
    .from(products)
    .leftJoin(variantJoin, eq(variantJoin.productId, products.id))
    .leftJoin(imagesJoin, eq(imagesJoin.productId, products.id))
    .leftJoin(genders, eq(genders.id, products.genderId))
    .leftJoin(brands, eq(brands.id, products.brandId))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(baseWhere)
    .groupBy(products.id, products.name, products.createdAt, genders.label)
    .orderBy(primaryOrder, desc(products.createdAt), asc(products.id))
    .limit(limit)
    .offset(offset);
  const countRows = await db
    .select({
      cnt: count(sql<number>`distinct ${products.id}`),
    })
    .from(products)
    .leftJoin(variantJoin, eq(variantJoin.productId, products.id))
    .leftJoin(genders, eq(genders.id, products.genderId))
    .leftJoin(brands, eq(brands.id, products.brandId))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(baseWhere);

  const productsOut: ProductListItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    imageUrl: r.imageUrl,
    minPrice: r.minPrice === null ? null : Number(r.minPrice),
    maxPrice: r.maxPrice === null ? null : Number(r.maxPrice),
    createdAt: r.createdAt,
    subtitle: r.subtitle ? `${r.subtitle} Shoes` : null,
  }));

  const totalCount = countRows[0]?.cnt ?? 0;

  return { products: productsOut, totalCount };
}

export type ProductVariantImage = {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type ProductVariantDetail = {
  id: string;
  sku: string;
  inStock: number;
  price: number;
  salePrice: number | null;
  color: {
    id: string;
    name: string;
    slug: string;
    hexCode: string;
  } | null;
  size: {
    id: string;
    name: string;
    slug: string;
    sortOrder: number;
  } | null;
  images: ProductVariantImage[];
};

export type ProductDetail = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  price: number | null;
  comparePrice: number | null;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  brand: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  } | null;
  gender: {
    id: string;
    label: string;
    slug: string;
  } | null;
  variants: ProductVariantDetail[];
  genericImages: ProductVariantImage[];
  createdAt: string;
  updatedAt: string;
};

export async function getProduct(productId: string): Promise<ProductDetail | null> {
  const rows = await db
    .select({
      productId: products.id,
      productName: products.name,
      productDescription: products.description,
      productBrandId: products.brandId,
      productCategoryId: products.categoryId,
      productGenderId: products.genderId,
      isPublished: products.isPublished,
      defaultVariantId: products.defaultVariantId,
      productCreatedAt: products.createdAt,
      productUpdatedAt: products.updatedAt,

      brandId: brands.id,
      brandName: brands.name,
      brandSlug: brands.slug,
      brandLogoUrl: brands.logoUrl,

      categoryId: categories.id,
      categoryName: categories.name,
      categorySlug: categories.slug,

      genderId: genders.id,
      genderLabel: genders.label,
      genderSlug: genders.slug,

      variantId: productVariants.id,
      variantSku: productVariants.sku,
      variantPrice: sql<number | null>`${productVariants.price}::numeric`,
      variantSalePrice: sql<number | null>`${productVariants.salePrice}::numeric`,
      variantColorId: productVariants.colorId,
      variantSizeId: productVariants.sizeId,
      variantInStock: productVariants.inStock,

      colorId: colors.id,
      colorName: colors.name,
      colorSlug: colors.slug,
      colorHex: colors.hexCode,

      sizeId: sizes.id,
      sizeName: sizes.name,
      sizeSlug: sizes.slug,
      sizeSortOrder: sizes.sortOrder,

      imageId: productImages.id,
      imageUrl: productImages.url,
      imageIsPrimary: productImages.isPrimary,
      imageSortOrder: productImages.sortOrder,
      imageVariantId: productImages.variantId,
    })
    .from(products)
    .leftJoin(brands, eq(brands.id, products.brandId))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(genders, eq(genders.id, products.genderId))
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .leftJoin(colors, eq(colors.id, productVariants.colorId))
    .leftJoin(sizes, eq(sizes.id, productVariants.sizeId))
    .leftJoin(productImages, eq(productImages.productId, products.id))
    .where(and(eq(products.id, productId), eq(products.isPublished, true)));

  if (!rows.length) return null;

  const head = rows[0];

  const variantsMap = new Map<string, ProductVariantDetail>();
  const genericImagesMap = new Map<string, ProductVariantImage>();

  for (const r of rows) {
    if (r.variantId && !variantsMap.has(r.variantId)) {
      variantsMap.set(r.variantId, {
        id: r.variantId,
        sku: r.variantSku!,
        price: r.variantPrice !== null ? Number(r.variantPrice) : 0,
        salePrice: r.variantSalePrice !== null ? Number(r.variantSalePrice) : null,
        inStock: r.variantInStock!,
        color: r.colorId
          ? {
              id: r.colorId,
              name: r.colorName!,
              slug: r.colorSlug!,
              hexCode: r.colorHex!,
            }
          : null,
        size: r.sizeId
          ? {
              id: r.sizeId,
              name: r.sizeName!,
              slug: r.sizeSlug!,
              sortOrder: r.sizeSortOrder!,
            }
          : null,
        images: [],
      });
    }

    if (r.imageId && r.imageUrl) {
      const image: ProductVariantImage = {
        id: r.imageId,
        url: r.imageUrl,
        isPrimary: r.imageIsPrimary ?? false,
        sortOrder: r.imageSortOrder ?? 0,
      };

      if (r.imageVariantId && variantsMap.has(r.imageVariantId)) {
        const variant = variantsMap.get(r.imageVariantId)!;
        if (!variant.images.some((variantImage) => variantImage.id === image.id)) {
          variant.images.push(image);
        }
      }

      if (!r.imageVariantId && !genericImagesMap.has(image.id)) {
        genericImagesMap.set(image.id, image);
      }
    }
  }

  const genericImages = Array.from(genericImagesMap.values()).sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });

  const variants = Array.from(variantsMap.values())
    .map((variant) => ({
      ...variant,
      images: [...variant.images].sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        return a.sortOrder - b.sortOrder;
      }),
    }))
    .sort((a, b) => {
      const aSort = a.size?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const bSort = b.size?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (aSort !== bSort) return aSort - bSort;
      return (a.color?.name ?? "").localeCompare(b.color?.name ?? "");
    });

  const defaultVariant =
    variants.find((variant) => variant.id === head.defaultVariantId) ??
    variants.find((variant) => variant.salePrice !== null) ??
    variants[0] ??
    null;

  const finalPrice = defaultVariant ? defaultVariant.salePrice ?? defaultVariant.price : null;
  const comparePrice = defaultVariant && defaultVariant.salePrice !== null ? defaultVariant.price : null;

  return {
    id: head.productId,
    title: head.productName,
    subtitle: head.genderLabel ? `${head.genderLabel} Shoes` : "Shoes",
    description: head.productDescription,
    price: finalPrice,
    comparePrice,
    category: head.categoryId
      ? {
          id: head.categoryId,
          name: head.categoryName!,
          slug: head.categorySlug!,
        }
      : null,
    brand: head.brandId
      ? {
          id: head.brandId,
          name: head.brandName!,
          slug: head.brandSlug!,
          logoUrl: head.brandLogoUrl ?? null,
        }
      : null,
    gender: head.genderId
      ? {
          id: head.genderId,
          label: head.genderLabel!,
          slug: head.genderSlug!,
        }
      : null,
    variants,
    genericImages,
    createdAt: head.productCreatedAt.toISOString(),
    updatedAt: head.productUpdatedAt.toISOString(),
  };
}
export type Review = {
  id: string;
  author: string;
  rating: number;
  title?: string;
  content: string;
  createdAt: string;
};

export type RecommendedProduct = {
  id: string;
  title: string;
  price: number | null;
  imageUrl: string;
};

export async function getProductReviews(productId: string): Promise<Review[]> {
  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      authorName: users.name,
      authorEmail: users.email,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(and(eq(reviews.productId, productId), isNotNull(reviews.comment)))
    .orderBy(desc(reviews.createdAt))
    .limit(10);

  const mapped = rows.map((r) => ({
    id: r.id,
    author: r.authorName?.trim() || r.authorEmail || "Anonymous",
    rating: r.rating,
    title: undefined,
    content: r.comment || "",
    createdAt: r.createdAt.toISOString(),
  }));

  if (mapped.length > 0) {
    return mapped;
  }

  return [
    {
      id: `${productId}-review-1`,
      author: "Nike Member",
      rating: 5,
      title: "Great comfort",
      content: "Comfortable all day, solid cushioning, and clean look.",
      createdAt: new Date().toISOString(),
    },
    {
      id: `${productId}-review-2`,
      author: "Street Runner",
      rating: 4,
      title: "Daily go-to",
      content: "Good fit and materials. Works well for casual everyday use.",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
}

export async function getRecommendedProducts(productId: string): Promise<RecommendedProduct[]> {
  const base = await db
    .select({
      id: products.id,
      categoryId: products.categoryId,
      brandId: products.brandId,
      genderId: products.genderId,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!base.length) return [];
  const b = base[0];
  const relationPredicates: SQL[] = [];
  if (b.categoryId) relationPredicates.push(eq(products.categoryId, b.categoryId));
  if (b.brandId) relationPredicates.push(eq(products.brandId, b.brandId));
  if (b.genderId) relationPredicates.push(eq(products.genderId, b.genderId));

  const v = db
    .select({
      productId: productVariants.productId,
      price: sql<number>`${productVariants.price}::numeric`.as("price"),
    })
    .from(productVariants)
    .as("v");

  const pi = db
    .select({
      productId: productImages.productId,
      url: productImages.url,
      rn: sql<number>`row_number() over (partition by ${productImages.productId} order by ${productImages.isPrimary} desc, ${productImages.sortOrder} asc)`.as(
        "rn",
      ),
    })
    .from(productImages)
    .as("pi");

  const priority = sql<number>`
    (case when ${products.categoryId} is not null and ${products.categoryId} = ${b.categoryId} then 1 else 0 end) * 3 +
    (case when ${products.brandId} is not null and ${products.brandId} = ${b.brandId} then 1 else 0 end) * 2 +
    (case when ${products.genderId} is not null and ${products.genderId} = ${b.genderId} then 1 else 0 end) * 1
  `;

  const rows = await db
    .select({
      id: products.id,
      title: products.name,
      minPrice: sql<number | null>`min(${v.price})`,
      imageUrl: sql<string | null>`max(case when ${pi.rn} = 1 then ${pi.url} else null end)`,
      createdAt: products.createdAt,
    })
    .from(products)
    .leftJoin(v, eq(v.productId, products.id))
    .leftJoin(pi, eq(pi.productId, products.id))
    .where(
      and(
        eq(products.isPublished, true),
        sql`${products.id} <> ${productId}`,
        relationPredicates.length > 0 ? or(...relationPredicates) : undefined,
      )
    )
    .groupBy(products.id, products.name, products.createdAt)
    .orderBy(
      desc(priority),
      desc(products.createdAt),
      asc(products.id)
    )
    .limit(8);

  const out: RecommendedProduct[] = [];
  for (const r of rows) {
    const img = r.imageUrl?.trim();
    if (!img) continue;
    out.push({
      id: r.id,
      title: r.title,
      price: r.minPrice === null ? null : Number(r.minPrice),
      imageUrl: img,
    });
    if (out.length >= 6) break;
  }
  return out;
}
