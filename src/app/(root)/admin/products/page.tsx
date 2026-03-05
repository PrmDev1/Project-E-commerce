import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  addProduct,
  deleteProduct,
  getAllProducts,
  updateProduct,
} from "@/lib/actions/product";
import { getBackendCurrentUser, getBackendIsAdmin } from "@/lib/auth/backend";

function toNumber(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatTHB(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
  }).format(value);
}

async function ensureAdminAccess() {
  const user = await getBackendCurrentUser();

  if (!user?.id) {
    redirect("/sign-in?next=%2Fadmin%2Fproducts");
  }

  const isAdmin = await getBackendIsAdmin();
  if (!isAdmin) {
    redirect("/");
  }
}

async function createProductAction(formData: FormData) {
  "use server";

  await ensureAdminAccess();

  const productName = String(formData.get("productName") ?? "").trim();
  const productDescription = String(formData.get("productDescription") ?? "").trim();
  const productBrand = String(formData.get("productBrand") ?? "").trim();
  const productGender = String(formData.get("productGender") ?? "unisex").trim().toLowerCase() as "men" | "women" | "unisex";
  const price = toNumber(formData.get("price"));
  const stock = toNumber(formData.get("stock"), 0);
  const image = formData.get("productImage");

  if (!(image instanceof File) || image.size === 0) {
    redirect("/admin/products?error=Please+upload+product+image");
  }

  const result = await addProduct(
    {
      productName,
      productDescription,
      productBrand,
      productGender,
      price,
      stock,
    },
    image,
  );

  if (!result.ok) {
    const error = encodeURIComponent(result.error ?? "Create product failed");
    redirect(`/admin/products?error=${error}`);
  }

  revalidatePath("/admin/products");
  redirect("/admin/products?success=Product+created");
}

async function updateProductAction(formData: FormData) {
  "use server";

  await ensureAdminAccess();

  const productid = String(formData.get("productid") ?? "").trim();
  const productName = String(formData.get("productName") ?? "").trim();
  const productDescription = String(formData.get("productDescription") ?? "").trim();
  const productBrand = String(formData.get("productBrand") ?? "").trim();
  const productGender = String(formData.get("productGender") ?? "unisex").trim().toLowerCase() as "men" | "women" | "unisex";
  const price = toNumber(formData.get("price"));
  const stock = toNumber(formData.get("stock"), 0);
  const image = formData.get("productImage");

  const result = await updateProduct(
    productid,
    {
      productName,
      productDescription,
      productBrand,
      productGender,
      price,
      stock,
    },
    image instanceof File && image.size > 0 ? image : undefined,
  );

  if (!result.ok) {
    const error = encodeURIComponent(result.error ?? "Update product failed");
    redirect(`/admin/products?error=${error}`);
  }

  revalidatePath("/admin/products");
  redirect("/admin/products?success=Product+updated");
}

async function deleteProductAction(formData: FormData) {
  "use server";

  await ensureAdminAccess();

  const productid = String(formData.get("productid") ?? "").trim();
  const result = await deleteProduct(productid);

  if (!result.ok) {
    const error = encodeURIComponent(result.error ?? "Delete product failed");
    redirect(`/admin/products?error=${error}`);
  }

  revalidatePath("/admin/products");
  redirect("/admin/products?success=Product+deleted");
}

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await ensureAdminAccess();

  const sp = await searchParams;
  const success = typeof sp.success === "string" ? sp.success : null;
  const error = typeof sp.error === "string" ? sp.error : null;

  const { products } = await getAllProducts({
    page: 1,
    limit: 200,
    sort: "newest",
    brandSlugs: [],
    categorySlugs: [],
    colorSlugs: [],
    genderSlugs: [],
    sizeSlugs: [],
    priceRanges: [],
  });

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading-3 text-dark-900">Admin Product Management</h1>
          <p className="mt-1 text-body text-dark-700">Manage products from your Express backend routes.</p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin"
            className="rounded-full border border-light-300 px-5 py-2 text-body text-dark-900 hover:border-dark-500"
          >
            Back to Admin
          </Link>
          <Link
            href="/admin/users"
            className="rounded-full border border-light-300 px-5 py-2 text-body text-dark-900 hover:border-dark-500"
          >
            Admin Users
          </Link>
        </div>
      </header>

      {success && (
        <div className="rounded-xl border border-light-300 bg-light-100 px-4 py-3 text-body text-dark-900">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-light-300 bg-light-100 px-4 py-3 text-body text-red-600">
          {error}
        </div>
      )}

      <section id="add-product" className="rounded-2xl border border-light-300 bg-light-100 p-6">
        <h2 className="text-heading-4 text-dark-900">Add Product</h2>

        <form action={createProductAction} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            name="productName"
            placeholder="Product name"
            className="rounded-xl border border-light-300 bg-light-100 px-4 py-3 text-body text-dark-900"
            required
          />
          <input
            name="productBrand"
            placeholder="Brand"
            className="rounded-xl border border-light-300 bg-light-100 px-4 py-3 text-body text-dark-900"
            required
          />
          <select
            name="productGender"
            defaultValue="unisex"
            className="rounded-xl border border-light-300 bg-light-100 px-4 py-3 text-body text-dark-900"
          >
            <option value="unisex">Unisex</option>
            <option value="men">Men</option>
            <option value="women">Women</option>
          </select>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="Price"
            className="rounded-xl border border-light-300 bg-light-100 px-4 py-3 text-body text-dark-900"
            required
          />
          <input
            name="stock"
            type="number"
            min="0"
            placeholder="Stock"
            className="rounded-xl border border-light-300 bg-light-100 px-4 py-3 text-body text-dark-900"
            required
          />
          <textarea
            name="productDescription"
            placeholder="Description"
            className="md:col-span-2 rounded-xl border border-light-300 bg-light-100 px-4 py-3 text-body text-dark-900"
            rows={4}
            required
          />
          <input
            name="productImage"
            type="file"
            accept="image/*"
            className="md:col-span-2 rounded-xl border border-light-300 bg-light-100 px-4 py-3 text-body text-dark-900"
            required
          />

          <button
            type="submit"
            className="md:col-span-2 rounded-full bg-dark-900 px-6 py-3 text-body-medium text-light-100 hover:bg-dark-700"
          >
            Add Product
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-heading-4 text-dark-900">Product List ({products.length})</h2>

        {products.length === 0 ? (
          <div className="rounded-xl border border-light-300 bg-light-100 p-6 text-body text-dark-700">
            No products found.
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <details key={product.id} className="rounded-xl border border-light-300 bg-light-100 p-4">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-md bg-light-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.imageUrl ?? "/shoes/shoe-5.avif"}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div>
                        <p className="text-body-medium text-dark-900">{product.name}</p>
                        <p className="text-caption text-dark-700">ID: {product.id}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-body-medium text-dark-900">{product.name}</p>
                      <p className="text-caption text-dark-700">{product.imageUrl ? "Image: backend" : "Image: fallback"}</p>
                    </div>
                    <p className="text-body text-dark-900">
                      {typeof product.minPrice === "number" ? formatTHB(product.minPrice) : "-"}
                    </p>
                  </div>
                </summary>

                <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto]">
                  <form action={updateProductAction} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input type="hidden" name="productid" value={product.id} />
                    <input
                      name="productName"
                      defaultValue={product.name}
                      className="rounded-xl border border-light-300 bg-light-100 px-4 py-3 text-body text-dark-900"
                      required
                    />
                    <input
                      name="productBrand"
                      defaultValue={product.subtitle?.replace(" Shoes", "") ?? ""}
                      placeholder="Brand"
                      className="rounded-xl border border-light-300 bg-light-100 px-4 py-3 text-body text-dark-900"
                      required
                    />
                    <select
                      name="productGender"
                      defaultValue={(product.gender ?? "unisex") as "men" | "women" | "unisex"}
                      className="rounded-xl border border-light-300 bg-light-100 px-4 py-3 text-body text-dark-900"
                    >
                      <option value="unisex">Unisex</option>
                      <option value="men">Men</option>
                      <option value="women">Women</option>
                    </select>
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={typeof product.minPrice === "number" ? product.minPrice : 0}
                      className="rounded-xl border border-light-300 bg-light-100 px-4 py-3 text-body text-dark-900"
                      required
                    />
                    <input
                      name="stock"
                      type="number"
                      min="0"
                      defaultValue={10}
                      className="rounded-xl border border-light-300 bg-light-100 px-4 py-3 text-body text-dark-900"
                      required
                    />
                    <textarea
                      name="productDescription"
                      defaultValue={product.description}
                      placeholder="Description"
                      className="md:col-span-2 rounded-xl border border-light-300 bg-light-100 px-4 py-3 text-body text-dark-900"
                      rows={3}
                      required
                    />
                    <input
                      name="productImage"
                      type="file"
                      accept="image/*"
                      className="md:col-span-2 rounded-xl border border-light-300 bg-light-100 px-4 py-3 text-body text-dark-900"
                    />

                    <button
                      type="submit"
                      className="md:col-span-2 rounded-full bg-dark-900 px-6 py-3 text-body-medium text-light-100 hover:bg-dark-700"
                    >
                      Update Product
                    </button>
                  </form>

                  <form action={deleteProductAction}>
                    <input type="hidden" name="productid" value={product.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-light-300 px-5 py-3 text-body text-dark-900 hover:border-dark-500"
                    >
                      Delete Product
                    </button>
                  </form>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
