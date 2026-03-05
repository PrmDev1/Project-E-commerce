import Link from "next/link";
import { redirect } from "next/navigation";
import { getBackendCurrentUser, getBackendIsAdmin } from "@/lib/auth/backend";

async function ensureAdminAccess() {
  const user = await getBackendCurrentUser();

  if (!user?.id) {
    redirect("/sign-in?next=%2Fadmin");
  }

  const isAdmin = await getBackendIsAdmin();
  if (!isAdmin) {
    redirect("/");
  }

  return user;
}

export default async function AdminDashboardPage() {
  const user = await ensureAdminAccess();

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-light-300 bg-light-100 p-8">
        <h1 className="text-heading-3 text-dark-900">Admin Panel</h1>
        <p className="mt-2 text-body text-dark-700">Welcome, {user.name ?? user.username ?? user.email ?? "Admin"}</p>
        <p className="mt-1 text-caption text-dark-700">Role: {user.role ?? "admin"}</p>
      </header>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <article className="rounded-2xl border border-light-300 bg-light-100 p-6">
          <h2 className="text-heading-4 text-dark-900">Admin Product Management</h2>
          <p className="mt-2 text-body text-dark-700">Create, update, and delete products from your backend API.</p>
          <Link
            href="/admin/products"
            className="mt-4 inline-flex rounded-full bg-dark-900 px-6 py-3 text-body-medium text-light-100 hover:bg-dark-700"
          >
            Open Product Management
          </Link>
        </article>

        <article className="rounded-2xl border border-light-300 bg-light-100 p-6">
          <h2 className="text-heading-4 text-dark-900">Admin Users</h2>
          <p className="mt-2 text-body text-dark-700">Manage users, update role/email/username, and view order history.</p>
          <Link
            href="/admin/users"
            className="mt-4 inline-flex rounded-full bg-dark-900 px-6 py-3 text-body-medium text-light-100 hover:bg-dark-700"
          >
            Open Admin Users
          </Link>
        </article>
      </section>

      <section>
        <Link
          href="/"
          className="inline-flex rounded-full border border-light-300 px-6 py-3 text-body text-dark-900 hover:border-dark-500"
        >
          Back to Home
        </Link>
      </section>
    </main>
  );
}
