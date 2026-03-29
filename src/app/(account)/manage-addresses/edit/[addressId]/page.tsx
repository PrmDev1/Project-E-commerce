import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBackendCurrentUser } from "@/lib/auth/backend";
import { getAddressesForCurrentUser } from "@/lib/actions/address";
import EditAddressForm from "@/components/address/EditAddressForm";

export const metadata = {
  title: "Edit Address",
};

type Props = {
  params: Promise<{ addressId: string }>;
};

export default async function EditAddressPage({ params }: Props) {
  const user = await getBackendCurrentUser();
  if (!user?.id) {
    redirect("/sign-in?next=%2Fmanage-addresses");
  }

  const { addressId } = await params;

  const addresses = await getAddressesForCurrentUser();
  const address = addresses.find((a) => a.id === addressId);

  if (!address) {
    notFound();
  }

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
        <Link href="/manage-addresses" className="hover:underline">
          Addresses
        </Link>{" "}
        /{" "}
        <span className="text-dark-900">Edit</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-heading-2 text-dark-900">Edit Address</h1>
        <p className="mt-1 text-body text-dark-700">
          Update the details for this shipping address.
        </p>
      </header>

      <EditAddressForm address={address} />
    </div>
  );
}
