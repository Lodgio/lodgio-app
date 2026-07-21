import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";

const adminNav = [
  { href: "/admin", label: "Hosts" },
  { href: "/admin/admins", label: "Admins" },
];

export function AdminShell({
  children,
  title,
  adminEmail,
}: {
  children: React.ReactNode;
  title: string;
  adminEmail: string;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm text-zinc-500">Lodgio Admin</p>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden text-sm text-blue-600 sm:inline">
              Back to dashboard
            </Link>
            <span className="hidden text-sm text-zinc-600 sm:inline">{adminEmail}</span>
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
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-white hover:shadow-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
