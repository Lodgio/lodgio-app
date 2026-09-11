"use client";

import { usePathname } from "next/navigation";
import { useNavigationPending } from "@/components/navigation-pending";

function titleForPath(pathname: string): string {
  if (pathname.startsWith("/admin/hosts/")) return "Host";
  const titles: Record<string, string> = {
    "/admin": "Hosts",
    "/admin/ops": "Activity",
    "/admin/admins": "Admins",
  };
  return titles[pathname] ?? "Admin";
}

export function AdminTitle() {
  const pathname = usePathname();
  const { pendingHref } = useNavigationPending();
  const path = pendingHref ? pendingHref.split("?")[0] : pathname;
  return <h1 className="text-lg font-semibold">{titleForPath(path)}</h1>;
}
