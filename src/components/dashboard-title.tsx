"use client";

import { usePathname } from "next/navigation";
import { isPhase12Demo } from "@/lib/demo";
import { useNavigationPending } from "@/components/navigation-pending";

function titleForPath(pathname: string): string {
  const titles: Record<string, string> = {
    "/dashboard": "Overview",
    "/dashboard/bookings": "Bookings",
    "/dashboard/submissions": "Unmatched submissions",
    "/dashboard/properties": "Properties",
    "/dashboard/caretakers": "Caretakers",
    "/dashboard/settings": "Settings",
    "/dashboard/onboarding": isPhase12Demo() ? "Connect Gmail" : "Onboarding",
  };
  return titles[pathname] ?? "Dashboard";
}

export function DashboardTitle() {
  const pathname = usePathname();
  const { pendingHref } = useNavigationPending();
  const path = pendingHref ? pendingHref.split("?")[0] : pathname;
  return <h1 className="text-lg font-semibold">{titleForPath(path)}</h1>;
}
