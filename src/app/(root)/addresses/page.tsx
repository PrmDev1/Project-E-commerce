import Link from "next/link";
import { redirect } from "next/navigation";
import { addAddress, getAddressesForCurrentUser } from "@/lib/actions/address";
import { getBackendCurrentUser } from "@/lib/auth/backend";

type SearchParams = Record<string, string | string[] | undefined>;

async function addAddressAction(formData: FormData) {
  "use server";

  const province = String(formData.get("province") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const locality = String(formData.get("locality") ?? "").trim();
  const postCode = String(formData.get("postCode") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const number = String(formData.get("number") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  const result = await addAddress({
    province,
    district,
    locality,
    postCode,
    name,
    number,
    note,
  });

  if (!result.ok) {
    const error = encodeURIComponent(result.error ?? "Unable to add address");
    redirect(`/addresses?error=${error}`);
  }

  redirect("/addresses?success=Address+added");
}

export default async function AddressesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getBackendCurrentUser();
  if (!user?.id) {
    redirect("/sign-in?next=%2Faddresses");
  }

  const sp = await searchParams;
  const success = typeof sp.success === "string" ? sp.success : null;
  const error = typeof sp.error === "string" ? sp.error : null;

  const addresses = await getAddressesForCurrentUser();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="py-2 text-caption text-dark-700">
        <Link href="/" className="hover:underline">Home</Link> / <Link href="/cart" className="hover:underline">Cart</Link> /{" "}
        <span className="text-dark-900">Addresses</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-heading-2 text-dark-900">Manage Addresses</h1>
        <p className="mt-1 text-body text-dark-700">Add your shipping address to continue checkout.</p>
      </header>

      {success && <p className="mb-4 rounded-lg border border-light-300 bg-light-100 px-4 py-3 text-body text-dark-900">{success}</p>}
      {error && <p className="mb-4 rounded-lg border border-light-300 bg-light-100 px-4 py-3 text-body text-red-600">{error}</p>}

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1fr]">
        <form action={addAddressAction} className="rounded-xl border border-light-300 bg-light-100 p-5 space-y-4">
          <h2 className="text-heading-4 text-dark-900">Add New Address</h2>

          <div>
            <label className="mb-1 block text-caption text-dark-700" htmlFor="name">Recipient name</label>
            <input id="name" name="name" required className="w-full rounded-lg border border-light-300 bg-light-100 px-3 py-2 text-body text-dark-900" />
          </div>

          <div>
            <label className="mb-1 block text-caption text-dark-700" htmlFor="number">Address line</label>
            <input id="number" name="number" required className="w-full rounded-lg border border-light-300 bg-light-100 px-3 py-2 text-body text-dark-900" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-caption text-dark-700" htmlFor="province">Province</label>
              <input id="province" name="province" required className="w-full rounded-lg border border-light-300 bg-light-100 px-3 py-2 text-body text-dark-900" />
            </div>
            <div>
              <label className="mb-1 block text-caption text-dark-700" htmlFor="district">District</label>
              <input id="district" name="district" required className="w-full rounded-lg border border-light-300 bg-light-100 px-3 py-2 text-body text-dark-900" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-caption text-dark-700" htmlFor="locality">Locality</label>
              <input id="locality" name="locality" required className="w-full rounded-lg border border-light-300 bg-light-100 px-3 py-2 text-body text-dark-900" />
            </div>
            <div>
              <label className="mb-1 block text-caption text-dark-700" htmlFor="postCode">Post code</label>
              <input id="postCode" name="postCode" required className="w-full rounded-lg border border-light-300 bg-light-100 px-3 py-2 text-body text-dark-900" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-caption text-dark-700" htmlFor="note">Note (optional)</label>
            <textarea id="note" name="note" rows={3} className="w-full rounded-lg border border-light-300 bg-light-100 px-3 py-2 text-body text-dark-900" />
          </div>

          <button type="submit" className="w-full rounded-full bg-dark-900 px-6 py-3 text-body-medium text-light-100 hover:opacity-90">
            Save Address
          </button>
        </form>

        <section className="rounded-xl border border-light-300 bg-light-100 p-5">
          <h2 className="text-heading-4 text-dark-900">Your Addresses</h2>
          {addresses.length === 0 ? (
            <p className="mt-3 text-body text-dark-700">No address found yet. Add one to continue checkout.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {addresses.map((address) => (
                <li key={address.id} className="rounded-lg border border-light-300 p-4">
                  <p className="text-body-medium text-dark-900">{address.name}</p>
                  <p className="text-body text-dark-700">{address.number}</p>
                  <p className="text-body text-dark-700">{address.locality}, {address.district}, {address.province} {address.postCode}</p>
                  {address.note && <p className="mt-1 text-caption text-dark-700">Note: {address.note}</p>}
                </li>
              ))}
            </ul>
          )}

          <Link href="/cart" className="mt-5 inline-block rounded-full border border-light-300 px-5 py-2 text-body text-dark-900 hover:border-dark-500">
            Back to Cart
          </Link>
        </section>
      </section>
    </main>
  );
}
