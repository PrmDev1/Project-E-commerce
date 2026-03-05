import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { getBackendCurrentUser, getBackendIsAdmin } from "@/lib/auth/backend";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const userPromise = getBackendCurrentUser();
  const isAdminPromise = getBackendIsAdmin();

  return (
    <RootLayoutContent userPromise={userPromise} isAdminPromise={isAdminPromise}>{children}</RootLayoutContent>
  );
}

async function RootLayoutContent({
  children,
  userPromise,
  isAdminPromise,
}: {
  children: React.ReactNode;
  userPromise: ReturnType<typeof getBackendCurrentUser>;
  isAdminPromise: ReturnType<typeof getBackendIsAdmin>;
}) {
  const [user, isAdmin] = await Promise.all([userPromise, isAdminPromise]);

  return (
    <>
      <Navbar
        showAdminLink={!!user?.id && (isAdmin || user?.role === "admin")}
        currentUser={
          user?.id
            ? {
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role ?? (isAdmin ? "admin" : undefined),
              }
            : null
        }
      />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
