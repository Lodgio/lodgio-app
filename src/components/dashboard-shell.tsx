import { Suspense } from "react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { getCurrentHost } from "@/lib/host";
import { isCurrentUserAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getDashboardNav,
  formatBookingStatus,
  bookingStatusColor,
  type NavCountKey,
} from "@/lib/demo";
import { SubmitButton } from "@/components/submit-button";
import { DashboardNav } from "@/components/dashboard-nav";
import { DashboardTitle } from "@/components/dashboard-title";
import { DashboardMain } from "@/components/dashboard-main";
import { NavigationPendingProvider } from "@/components/navigation-pending";
import { LodgioLogo } from "@/components/lodgio-logo";

async function getNavCounts(hostId: string): Promise<Partial<Record<NavCountKey, number>>> {
  const supabase = await createClient();
  const [
    { count: bookings },
    { count: submissions },
    { count: properties },
    { count: caretakers },
  ] = await Promise.all([
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("host_id", hostId),
    supabase
      .from("form_submissions")
      .select("*", { count: "exact", head: true })
      .eq("host_id", hostId)
      .eq("matched", false),
    supabase.from("properties").select("*", { count: "exact", head: true }).eq("host_id", hostId),
    supabase.from("caretakers").select("*", { count: "exact", head: true }).eq("host_id", hostId),
  ]);

  return {
    bookings: bookings ?? 0,
    submissions: submissions ?? 0,
    properties: properties ?? 0,
    caretakers: caretakers ?? 0,
  };
}

function ShellChrome({
  children,
  navFallback,
  headerActions,
}: {
  children: React.ReactNode;
  navFallback: React.ReactNode;
  headerActions: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--lodgio-cream)] text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <LodgioLogo href="/dashboard" size="sm" />
            {headerActions}
          </div>
          <div className="flex items-center gap-3">
            <form action={signOut}>
              <SubmitButton
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                pendingLabel="Signing out…"
              >
                Sign out
              </SubmitButton>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        {navFallback}
        <main>{children}</main>
      </div>
    </div>
  );
}

/**
 * Sync shell frame. Auth/cookie work stays inside Suspense so navigations are not
 * blocked waiting for layout data (otherwise loading.tsx never appears).
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const nav = getDashboardNav();
  const navPlaceholder = (
    <nav className="flex flex-row gap-2 overflow-x-auto md:flex-col md:gap-1">
      {nav.map((item) => (
        <span key={item.href} className="rounded-md px-3 py-2 text-sm text-zinc-400">
          {item.label}
        </span>
      ))}
    </nav>
  );

  return (
    <Suspense
      fallback={
        <ShellChrome
          navFallback={navPlaceholder}
          headerActions={<h1 className="text-lg font-semibold">Dashboard</h1>}
        >
          {children}
        </ShellChrome>
      }
    >
      <NavigationPendingProvider>
        <div className="min-h-screen bg-zinc-50 text-zinc-900">
          <header className="border-b border-zinc-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm text-zinc-500">Lodgio</p>
                <DashboardTitle />
              </div>
              <div className="flex items-center gap-3">
                <Suspense fallback={null}>
                  <DashboardHeaderActions />
                </Suspense>
                <form action={signOut}>
                  <SubmitButton
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                    pendingLabel="Signing out…"
                  >
                    Sign out
                  </SubmitButton>
                </form>
              </div>
            </div>
          </header>
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
            <Suspense fallback={navPlaceholder}>
              <DashboardNavLoader />
            </Suspense>
            <main>
              <DashboardMain>{children}</DashboardMain>
            </main>
          </div>
        </div>
      </NavigationPendingProvider>
    </Suspense>
  );
}

async function DashboardHeaderActions() {
  const [host, isAdmin] = await Promise.all([getCurrentHost(), isCurrentUserAdmin()]);
  return (
    <>
      {isAdmin ? (
        <Link href="/admin" className="hidden text-sm text-blue-600 sm:inline">
          Admin
        </Link>
      ) : null}
      <span className="hidden text-sm text-zinc-600 sm:inline">
        {host?.business_name || host?.slug}
      </span>
    </>
  );
}

async function DashboardNavLoader() {
  const host = await getCurrentHost();
  const nav = getDashboardNav();
  const counts = host ? await getNavCounts(host.id) : {};
  return <DashboardNav items={[...nav]} counts={counts} />;
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-zinc-200 bg-white p-5 shadow-sm ${className}`}>
      {title ? <h2 className="mb-4 text-base font-semibold">{title}</h2> : null}
      {children}
    </section>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${bookingStatusColor(status)}`}
    >
      {formatBookingStatus(status)}
    </span>
  );
}
