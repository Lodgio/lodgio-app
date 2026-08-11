"use client";

import { NavLink } from "@/components/nav-link";
import type { NavCountKey } from "@/lib/demo";

type NavItem = {
  href: string;
  label: string;
  countKey?: NavCountKey;
};

export function DashboardNav({
  items,
  counts,
}: {
  items: readonly NavItem[];
  counts: Partial<Record<NavCountKey, number>>;
}) {
  return (
    <nav className="flex flex-row gap-2 overflow-x-auto md:flex-col md:gap-1">
      {items.map((item) => {
        const count = item.countKey ? counts[item.countKey] : undefined;
        const label = count ? `${item.label} (${count})` : item.label;

        return (
          <NavLink
            key={item.href}
            href={item.href}
            exact={item.href === "/dashboard"}
            className="rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-white hover:shadow-sm"
            activeClassName="bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
            pendingClassName="animate-pulse"
          >
            {label}
          </NavLink>
        );
      })}
    </nav>
  );
}
