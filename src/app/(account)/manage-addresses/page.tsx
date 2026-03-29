import Link from "next/link";
import { redirect } from "next/navigation";
import { getBackendCurrentUser } from "@/lib/auth/backend";
import { getAddressesForCurrentUser } from "@/lib/actions/address";
import AddressCard from "@/components/address/AddressCard";

export const metadata = {
  title: "Manage Addresses",
};

export default async function ManageAddressesPage() {
  const user = await getBackendCurrentUser();
  if (!user?.id) {
    redirect("/sign-in?next=%2Fmanage-addresses");
  }

  const addresses = await getAddressesForCurrentUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 text-caption text-dark-700" aria-label="Breadcrumb">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/edit-profile" className="hover:underline">
          Edit Profile
        </Link>{" "}
        /{" "}
        <span className="text-dark-900">Addresses</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-heading-2 text-dark-900">Manage Addresses</h1>
        <p className="mt-1 text-body text-dark-700">
          View and edit your saved shipping addresses.
        </p>
      </header>

      {addresses.length === 0 ? (
        <section className="rounded-xl border border-light-300 bg-light-100 p-6">
          <p className="text-body text-dark-700">
            No addresses saved yet.{" "}
            <Link href="/addresses" className="underline hover:text-dark-900">
              Add your first address.
            </Link>
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {addresses.map((address, index) => (
            <AddressCard
              key={address.id}
              address={address}
              isDefault={index === 0}
            />
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/addresses"
          className="rounded-full bg-dark-900 px-6 py-3 text-body-medium text-light-100 transition-opacity hover:opacity-90"
        >
          Add New Address
        </Link>
        <Link
          href="/edit-profile"
          className="rounded-full border border-light-300 px-6 py-3 text-body text-dark-900 transition-colors hover:border-dark-500"
        >
          Back to Profile
        </Link>
      </div>
    </div>
  );
}
