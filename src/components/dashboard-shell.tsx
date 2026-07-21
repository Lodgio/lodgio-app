import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { getCurrentHost } from "@/lib/host";
import { isCurrentUserAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getDashboardNav,
  isPhase12Demo,
  formatBookingStatus,
  bookingStatusColor,
  type NavCountKey,
} from "@/lib/demo";

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

export async function DashboardShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const host = await getCurrentHost();
  const nav = getDashboardNav();
  const phase12 = isPhase12Demo();
  const isAdmin = await isCurrentUserAdmin();
  const counts = host ? await getNavCounts(host.id) : {};

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm text-zinc-500">Lodgio</p>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <Link href="/admin" className="hidden text-sm text-blue-600 sm:inline">
                Admin
              </Link>
            ) : null}
            <span className="hidden text-sm text-zinc-600 sm:inline">
              {host?.business_name || host?.slug}
            </span>
            <form action={signOut}>
              <button className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <nav className="flex flex-row gap-2 overflow-x-auto md:flex-col md:gap-1">
          {nav.map((item) => {
            const countKey = "countKey" in item ? item.countKey : undefined;
            const count = countKey ? counts[countKey] : undefined;
            const label = count ? `${item.label} (${count})` : item.label;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-white hover:shadow-sm"
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <main>
          {phase12 ? (
            <p className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              Demo mode: Phase 1 &amp; 2 — connect Gmail and review parsed bookings from Airbnb
              emails.
            </p>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
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
