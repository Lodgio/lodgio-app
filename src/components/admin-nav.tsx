"use client";

import { NavLink } from "@/components/nav-link";

export function AdminNav({ children }: { children: React.ReactNode }) {
  return (
    <nav className="flex flex-row gap-2 overflow-x-auto md:flex-col md:gap-1">{children}</nav>
  );
}

export function AdminNavLink({
  href,
  label,
  exact,
  activePrefixes,
  badge,
}: {
  href: string;
  label: string;
  exact?: boolean;
  activePrefixes?: string[];
  badge?: React.ReactNode;
}) {
  return (
    <NavLink
      href={href}
      exact={exact}
      activePrefixes={activePrefixes}
      className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-white hover:shadow-sm"
      activeClassName="bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
      pendingClassName="animate-pulse"
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span>{label}</span>
        {badge}
      </span>
    </NavLink>
  );
}

export function AdminNavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="rounded-full bg-[var(--lodgio-olive)] px-2 py-0.5 text-xs font-medium text-[var(--lodgio-cream)]">
      {count}
    </span>
  );
}
