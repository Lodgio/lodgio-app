import { Suspense } from "react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { SubmitButton } from "@/components/submit-button";
import { LodgioLogo } from "@/components/lodgio-logo";
import { NavigationPendingProvider } from "@/components/navigation-pending";
import { AdminNav, AdminNavBadge, AdminNavLink } from "@/components/admin-nav";
import { AdminTitle } from "@/components/admin-title";
import { AdminMain } from "@/components/admin-main";

function AdminChrome({
  children,
  nav,
  headerActions,
  title,
}: {
  children: React.ReactNode;
  nav: React.ReactNode;
  headerActions: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--lodgio-cream)] text-[var(--lodgio-olive)]">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <LodgioLogo href="/admin" size="sm" />
            <p className="mt-1 text-xs text-zinc-500">Admin</p>
            {title}
          </div>
          <div className="flex items-center gap-3">
            {headerActions}
            <form action={signOut}>
              <SubmitButton
                className="btn-secondary px-4 py-1.5 text-xs"
                pendingLabel="Signing out…"
              >
                Sign out
              </SubmitButton>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        {nav}
        <main>{children}</main>
      </div>
    </div>
  );
}

/**
 * Sync admin chrome so tab clicks highlight immediately. Badge counts and the
 * admin email stay inside Suspense so they do not block the next page.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const navPlaceholder = (
    <nav className="flex flex-row gap-2 overflow-x-auto md:flex-col md:gap-1">
      {["Hosts", "Activity", "Admins"].map((label) => (
        <span key={label} className="rounded-md px-3 py-2 text-sm text-zinc-400">
          {label}
        </span>
      ))}
    </nav>
  );

  return (
    <Suspense
      fallback={
        <AdminChrome nav={navPlaceholder} headerActions={null} title={<h1 className="text-lg font-semibold">Admin</h1>}>
          {children}
        </AdminChrome>
      }
    >
      <NavigationPendingProvider>
        <AdminChrome
          title={<AdminTitle />}
          nav={
            <AdminNav>
              <AdminNavLink
                href="/admin"
                label="Hosts"
                exact
                activePrefixes={["/admin/hosts"]}
                badge={
                  <Suspense fallback={null}>
                    <HostsPendingBadge />
                  </Suspense>
                }
              />
              <AdminNavLink
                href="/admin/ops"
                label="Activity"
                badge={
                  <Suspense fallback={null}>
                    <OpsCriticalBadge />
                  </Suspense>
                }
              />
              <AdminNavLink href="/admin/admins" label="Admins" />
            </AdminNav>
          }
          headerActions={
            <Suspense fallback={null}>
              <AdminHeaderActions />
            </Suspense>
          }
        >
          <AdminMain>{children}</AdminMain>
        </AdminChrome>
      </NavigationPendingProvider>
    </Suspense>
  );
}

async function AdminHeaderActions() {
  const admin = await requireAdmin();
  return (
    <>
      <Link href="/dashboard" className="link hidden text-sm sm:inline">
        Back to dashboard
      </Link>
      <span className="hidden text-sm text-zinc-600 sm:inline">{admin.email}</span>
    </>
  );
}

async function HostsPendingBadge() {
  const service = createServiceClient();
  const { count } = await service
    .from("host_settings")
    .select("*", { count: "exact", head: true })
    .eq("gmail_access_status", "pending_review");
  return <AdminNavBadge count={count ?? 0} />;
}

async function OpsCriticalBadge() {
  const service = createServiceClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await service
    .from("ops_events")
    .select("*", { count: "exact", head: true })
    .eq("severity", "critical")
    .gte("created_at", since);
  return <AdminNavBadge count={error ? 0 : (count ?? 0)} />;
}
