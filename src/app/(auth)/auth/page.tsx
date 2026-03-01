import Link from "next/link";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function AuthLandingPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/";
  const signInHref = `/sign-in?next=${encodeURIComponent(nextPath)}`;
  const signUpHref = `/sign-up?next=${encodeURIComponent(nextPath)}`;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-10">
      <section className="w-full rounded-xl border border-light-300 bg-light-100 p-6">
        <h1 className="text-heading-3 text-dark-900">Continue to checkout</h1>
        <p className="mt-2 text-body text-dark-700">Sign in or create an account to continue with your order.</p>
        <div className="mt-6 space-y-3">
          <Link
            href={signInHref}
            className="block rounded-full bg-dark-900 px-6 py-3 text-center text-body-medium text-light-100 transition hover:opacity-90"
          >
            Sign In
          </Link>
          <Link
            href={signUpHref}
            className="block rounded-full border border-light-300 px-6 py-3 text-center text-body-medium text-dark-900 transition hover:border-dark-500"
          >
            Create Account
          </Link>
        </div>
      </section>
    </main>
  );
}
