import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getAllUsersForAdmin,
  getAllUsersOrderHistoryForAdmin,
  updateUserProfileByAdmin,
} from "@/lib/actions/admin";
import { getBackendCurrentUser, getBackendIsAdmin } from "@/lib/auth/backend";
import RetryHistoryButton from "@/components/RetryHistoryButton";

type SearchParams = Record<string, string | string[] | undefined>;

async function ensureAdminAccess() {
  const user = await getBackendCurrentUser();

  if (!user?.id) {
    redirect("/sign-in?next=%2Fadmin%2Fusers");
  }

  const isAdmin = await getBackendIsAdmin();
  if (!isAdmin) {
    redirect("/");
  }
}

async function updateUserAction(formData: FormData) {
  "use server";

  await ensureAdminAccess();

  const userid = String(formData.get("userid") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  const result = await updateUserProfileByAdmin({
    userid,
    username,
    email,
    role,
  });

  if (!result.ok) {
    const message = encodeURIComponent(result.error ?? "Update user failed");
    redirect(`/admin/users?error=${message}`);
  }

  revalidatePath("/admin/users");
  redirect("/admin/users?success=User+updated");
}

async function retryOrderHistoryAction() {
  "use server";

  await ensureAdminAccess();
  revalidatePath("/admin/users");
  redirect(`/admin/users?retry=${Date.now()}`);
}

function formatDate(input: string) {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return input;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
  }).format(value);
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await ensureAdminAccess();

  const sp = await searchParams;
  const success = typeof sp.success === "string" ? sp.success : null;
  const error = typeof sp.error === "string" ? sp.error : null;

  const users = await getAllUsersForAdmin();

  let usersWithHistory: Awaited<ReturnType<typeof getAllUsersOrderHistoryForAdmin>> = [];
  let historyError: string | null = null;

  try {
    usersWithHistory = await getAllUsersOrderHistoryForAdmin();
  } catch (historyLoadError) {
    historyError = historyLoadError instanceof Error
      ? historyLoadError.message
      : "Unable to load users order history";
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading-3 text-dark-900">Admin Users</h1>
          <p className="mt-1 text-body text-dark-700">Manage users and view order history in one page.</p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin"
            className="rounded-full border border-light-300 px-5 py-2 text-body text-dark-900 hover:border-dark-500"
          >
            Back to Admin
          </Link>
          <Link
            href="/admin/products"
            className="rounded-full border border-light-300 px-5 py-2 text-body text-dark-900 hover:border-dark-500"
          >
            Product Management
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

      {historyError && (
        <div className="rounded-xl border border-light-300 bg-light-100 px-4 py-3 text-body text-red-600">
          Order history is unavailable right now: {historyError}
        </div>
      )}

      <section className="rounded-2xl border border-light-300 bg-light-100 p-5">
        <h2 className="text-heading-4 text-dark-900">Users ({users.length})</h2>

        {users.length === 0 ? (
          <p className="mt-3 text-body text-dark-700">No users found.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-caption text-dark-700">
                  <th className="px-3 py-2">User ID</th>
                  <th className="px-3 py-2">Username</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.userid} className="rounded-lg border border-light-300 bg-light-100 align-top">
                    <td className="px-3 py-2 text-caption text-dark-700">{user.userid}</td>
                    <td className="px-3 py-2">
                      <form action={updateUserAction} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_120px_auto] md:items-center">
                        <input type="hidden" name="userid" value={user.userid} />
                        <input
                          name="username"
                          defaultValue={user.username}
                          className="rounded-lg border border-light-300 bg-light-100 px-3 py-2 text-body text-dark-900"
                          required
                        />
                        <input
                          name="email"
                          type="email"
                          defaultValue={user.email}
                          className="rounded-lg border border-light-300 bg-light-100 px-3 py-2 text-body text-dark-900"
                          required
                        />
                        <select
                          name="role"
                          defaultValue={user.role}
                          className="rounded-lg border border-light-300 bg-light-100 px-3 py-2 text-body text-dark-900"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded-full bg-dark-900 px-4 py-2 text-body-medium text-light-100 hover:bg-dark-700"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="px-3 py-2 text-body text-dark-900">{user.email}</td>
                    <td className="px-3 py-2 text-body text-dark-900">{user.role}</td>
                    <td className="px-3 py-2 text-caption text-dark-700">Edit inline</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-heading-4 text-dark-900">Order History by User</h2>
          <form action={retryOrderHistoryAction}>
            <RetryHistoryButton />
          </form>
        </div>

        {historyError ? (
          <div className="rounded-xl border border-light-300 bg-light-100 p-5 text-body text-red-600">
            Order history is unavailable right now: {historyError}
          </div>
        ) : usersWithHistory.length === 0 ? (
          <div className="rounded-xl border border-light-300 bg-light-100 p-5 text-body text-dark-700">
            No history data found.
          </div>
        ) : (
          usersWithHistory.map((user) => (
            <article key={user.userid} className="rounded-2xl border border-light-300 bg-light-100 p-5">
              <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-heading-5 text-dark-900">{user.username}</h3>
                  <p className="text-caption text-dark-700">{user.email}</p>
                </div>
                <p className="text-caption text-dark-700">Orders: {user.order_history.length}</p>
              </header>

              {user.order_history.length === 0 ? (
                <p className="text-body text-dark-700">No orders yet.</p>
              ) : (
                <div className="space-y-3">
                  {user.order_history.map((order) => (
                    <div key={order.orderid} className="rounded-xl border border-light-300 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-body-medium text-dark-900">Order: {order.orderid}</p>
                        <p className="text-caption text-dark-700">{formatDate(order.datetime)}</p>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-4 text-caption text-dark-700">
                        <span>Status: {order.status}</span>
                        <span>Address: {order.addressid}</span>
                        <span>Total: {formatAmount(order.totalamount)}</span>
                      </div>

                      {order.items.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {order.items.map((item) => (
                            <li key={item.itemid} className="text-caption text-dark-700">
                              {item.productname} • Qty {item.quantity} • Size {item.size} • {formatAmount(item.price)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </section>
    </main>
  );
}
