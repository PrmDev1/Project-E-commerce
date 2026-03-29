import Link from "next/link";
import { redirect } from "next/navigation";
import { getBackendCurrentUser } from "@/lib/auth/backend";
import { getAddressesForCurrentUser } from "@/lib/actions/address";
import EditProfileForm from "@/components/EditProfileForm";

export const metadata = {
  title: "Edit Profile",
};

export default async function EditProfilePage() {
  const user = await getBackendCurrentUser();
  if (!user?.id) {
    redirect("/sign-in?next=%2Fedit-profile");
  }

  const addresses = await getAddressesForCurrentUser();
  const primaryAddress = addresses[0] ?? null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 text-caption text-dark-700" aria-label="Breadcrumb">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        /{" "}
        <span className="text-dark-900">Edit Profile</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-heading-2 text-dark-900">Edit Profile</h1>
        <p className="mt-1 text-body text-dark-700">
          Manage your personal information and shipping addresses.
        </p>
      </header>

      <EditProfileForm
        initialUsername={user.username ?? user.name ?? ""}
        primaryAddress={primaryAddress}
      />
    </div>
  );
}
