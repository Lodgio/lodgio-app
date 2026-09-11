import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/submit-button";
import { createServiceClient } from "@/lib/supabase/service";
import { LodgioLogo } from "@/components/lodgio-logo";

export async function AdminShell({
  children,
  title,
  adminEmail,
}: {
  children: React.ReactNode;
  title: string;
  adminEmail: string;
}) {
  const service = createServiceClient();
  const { count } = await service
    .from("host_settings")
    .select("*", { count: "exact", head: true })
    .eq("gmail_access_status", "pending_review");
  const pending = count ?? 0;

  const adminNav = [
    { href: "/admin", label: "Hosts", badge: pending },
    { href: "/admin/admins", label: "Admins", badge: 0 },
  ];

  return (
    <div className="min-h-screen bg-[var(--lodgio-cream)] text-[var(--lodgio-olive)]">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <LodgioLogo href="/admin" size="sm" />
            <p className="mt-1 text-xs text-zinc-500">Admin</p>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="link hidden text-sm sm:inline">
              Back to dashboard
            </Link>
            <span className="hidden text-sm text-zinc-600 sm:inline">{adminEmail}</span>
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
        <nav className="flex flex-row gap-2 overflow-x-auto md:flex-col md:gap-1">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-white"
            >
              <span>{item.label}</span>
              {item.badge > 0 ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
