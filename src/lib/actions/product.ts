"use server";

import { backendAuthRequest, readResponseBody } from "@/lib/auth/backend";
import { type NormalizedProductFilters } from "@/lib/utils/query";

type BackendProduct = {
  productid?: string;
  productId?: string;
  productname?: string;
  productName?: string;
  productdescription?: string;
  productDescription?: string;
  productimage?: string;
  productImage?: string;
  productbrand?: string;
  productBrand?: string;
  imageurl?: string;
  imageUrl?: string;
  price?: number | string;
  stock?: number;
  productgender?: string;
  productGender?: string;
};

type ProductListItem = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  createdAt: Date;
  subtitle?: string | null;
  gender?: string;
};

export type GetAllProductsResult = {
  products: ProductListItem[];
  totalCount: number;
};

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

const DEFAULT_IMAGE = "/shoes/shoe-1.avif";
const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_BACKEND_URL ??
  "http://localhost:5000";

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function imageToUrl(image?: string) {
  if (!image) return null;
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  if (image.startsWith("/shoes/")) {
    return image;
  }

  if (image.startsWith("/")) {
    if (image.startsWith("/image/")) {
      return `${BACKEND_BASE_URL}/uploads/${image.replace(/^\/image\//, "")}`;
    }
    return `${BACKEND_BASE_URL}${image}`;
  }

  return `${BACKEND_BASE_URL}/uploads/${image}`;
}

function normalizeBackendProduct(raw: BackendProduct): ProductListItem | null {
  const id = raw.productid ?? raw.productId;
  if (!id) return null;

  const name = raw.productname ?? raw.productName ?? "Untitled Product";
  const description = raw.productdescription ?? raw.productDescription ?? "";
  const price = toNumber(raw.price);
  const imageUrl = imageToUrl((raw.imageUrl ?? raw.imageurl ?? raw.productimage ?? raw.productImage) as string | undefined);

  return {
    id,
    name,
    description,
    imageUrl,
    minPrice: price,
    maxPrice: price,
    createdAt: new Date(),
    subtitle: raw.productbrand ?? raw.productBrand ?? null,
    gender: String(raw.productgender ?? raw.productGender ?? "unisex").toLowerCase(),
  };
}

function buildFilterPayload(filters: NormalizedProductFilters) {
  const filter: Record<string, unknown> = {};

  if (filters.search) {
    filter.name = filters.search;
  }

  if (filters.brandSlugs?.length) {
    filter.brand = filters.brandSlugs[0];
  }

  if (filters.priceMax !== undefined) {
    filter.price = filters.priceMax;
  }

  if (filters.genderSlugs?.length) {
    filter.gender = filters.genderSlugs[0];
  }

  return { filter };
}

async function fetchProductsFromBackend(filters?: NormalizedProductFilters): Promise<BackendProduct[]> {
  if (filters && (filters.search || filters.brandSlugs?.length || filters.priceMax !== undefined || filters.genderSlugs?.length)) {
    const response = await backendAuthRequest("/api/products/filter-products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(buildFilterPayload(filters)),
    });

    const { json } = await readResponseBody(response);
    if (!response.ok) return [];

    const products = (json?.products ?? json) as unknown;
    return Array.isArray(products) ? (products as BackendProduct[]) : [];
  }

  const response = await backendAuthRequest("/api/products/getAllProducts", {
    method: "GET",
  });

  const { json } = await readResponseBody(response);
  if (!response.ok) return [];

  const products = (json?.products ?? json) as unknown;
  return Array.isArray(products) ? (products as BackendProduct[]) : [];
}

export async function getAllProducts(filters: NormalizedProductFilters): Promise<GetAllProductsResult> {
  const rawProducts = await fetchProductsFromBackend(filters);
  let products = rawProducts
    .map(normalizeBackendProduct)
    .filter((product): product is ProductListItem => product !== null);

  if (filters.sort === "price_asc") {
    products = products.sort((a, b) => (a.minPrice ?? Number.MAX_SAFE_INTEGER) - (b.minPrice ?? Number.MAX_SAFE_INTEGER));
  } else if (filters.sort === "price_desc") {
    products = products.sort((a, b) => (b.maxPrice ?? 0) - (a.maxPrice ?? 0));
  }

  const totalCount = products.length;
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.max(1, Math.min(filters.limit ?? 60, 60));
  const offset = (page - 1) * limit;
  const paged = products.slice(offset, offset + limit);

  return { products: paged, totalCount };
}

export async function getProduct(productId: string): Promise<ProductDetail | null> {
  const response = await backendAuthRequest(`/api/products/get-product/${productId}`, {
    method: "GET",
  });

  if (!response.ok) {
    return null;
  }

  const { json } = await readResponseBody(response);
  const raw = (json?.product ?? json) as BackendProduct | undefined;
  if (!raw) return null;

  const id = raw.productid ?? raw.productId;
  if (!id) return null;

  const title = raw.productname ?? raw.productName ?? "Untitled Product";
  const description = raw.productdescription ?? raw.productDescription ?? "";
  const brandName = raw.productbrand ?? raw.productBrand ?? null;
  const price = toNumber(raw.price);
  const resolvedImageUrl = imageToUrl((raw.imageUrl ?? raw.imageurl ?? raw.productimage ?? raw.productImage) as string | undefined) ?? DEFAULT_IMAGE;

  return {
    id,
    title,
    subtitle: brandName ? `${brandName} Shoes` : "Shoes",
    description,
    price,
    comparePrice: null,
    category: null,
    brand: brandName
      ? {
          id: brandName,
          name: brandName,
          slug: brandName.toLowerCase().replace(/\s+/g, "-"),
          logoUrl: null,
        }
      : null,
    gender: null,
    variants: [
      {
        id: `${id}-default`,
        sku: `${id}-sku`,
        inStock: raw.stock ?? 0,
        price: price ?? 0,
        salePrice: null,
        color: null,
        size: null,
        images: [
          {
            id: `${id}-image-1`,
            url: resolvedImageUrl,
            isPrimary: true,
            sortOrder: 0,
          },
        ],
      },
    ],
    genericImages: [
      {
        id: `${id}-image-generic`,
        url: resolvedImageUrl,
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function getProductReviews(productId: string): Promise<Review[]> {
  return [
    {
      id: `${productId}-review-1`,
      author: "Nike Member",
      rating: 5,
      title: "Great comfort",
      content: "Comfortable all day and easy to style.",
      createdAt: new Date().toISOString(),
    },
  ];
}

export async function getRecommendedProducts(productId: string): Promise<RecommendedProduct[]> {
  const response = await backendAuthRequest("/api/products/getAllProducts", {
    method: "GET",
  });

  if (!response.ok) return [];

  const { json } = await readResponseBody(response);
  const products = (json?.products ?? json) as unknown;
  if (!Array.isArray(products)) return [];

  return (products as BackendProduct[])
    .filter((product) => (product.productid ?? product.productId) !== productId)
    .slice(0, 6)
    .map((product) => {
      const id = product.productid ?? product.productId ?? "";
      const title = product.productname ?? product.productName ?? "Untitled Product";
      const price = toNumber(product.price);
      const imageUrl = imageToUrl(product.productimage ?? product.productImage) ?? DEFAULT_IMAGE;

      return {
        id,
        title,
        price,
        imageUrl,
      };
    })
    .filter((product) => product.id.length > 0);
}

export type ProductMutationInput = {
  productName: string;
  productDescription: string;
  productBrand: string;
  price: number;
  stock: number;
  productGender: "men" | "women" | "unisex";
};

export async function addProduct(input: ProductMutationInput, productImage: File) {
  const formData = new FormData();
  formData.append("productName", input.productName);
  formData.append("productDescription", input.productDescription);
  formData.append("productBrand", input.productBrand);
  formData.append("price", String(input.price));
  formData.append("stock", String(input.stock));
  formData.append("productGender", input.productGender);
  formData.append("productImage", productImage);

  const response = await backendAuthRequest("/api/products/add-product", {
    method: "POST",
    body: formData,
  });

  const { json, text } = await readResponseBody(response);
  return {
    ok: response.ok,
    data: json,
    error: response.ok ? undefined : (typeof json?.message === "string" ? json.message : text),
  };
}

export async function updateProduct(productid: string, input: ProductMutationInput, productImage?: File) {
  const formData = new FormData();
  formData.append("productName", input.productName);
  formData.append("productDescription", input.productDescription);
  formData.append("productBrand", input.productBrand);
  formData.append("price", String(input.price));
  formData.append("stock", String(input.stock));
  formData.append("productGender", input.productGender);
  if (productImage) {
    formData.append("productImage", productImage);
  }

  const response = await backendAuthRequest(`/api/products/update-product/${productid}`, {
    method: "PUT",
    body: formData,
  });

  const { json, text } = await readResponseBody(response);
  return {
    ok: response.ok,
    data: json,
    error: response.ok ? undefined : (typeof json?.message === "string" ? json.message : text),
  };
}

export async function deleteProduct(productid: string) {
  const response = await backendAuthRequest(`/api/products/delete-product/${productid}`, {
    method: "DELETE",
  });

  const { json, text } = await readResponseBody(response);
  return {
    ok: response.ok,
    data: json,
    error: response.ok ? undefined : (typeof json?.message === "string" ? json.message : text),
  };
}
