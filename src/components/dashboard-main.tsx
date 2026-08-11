"use client";

import { useNavigationPending } from "@/components/navigation-pending";
import { DashboardContentSkeleton } from "@/components/dashboard-content-skeleton";

/** Swap main content to a skeleton the instant a nav click happens. */
export function DashboardMain({ children }: { children: React.ReactNode }) {
  const { isPending } = useNavigationPending();
  if (isPending) {
    return <DashboardContentSkeleton />;
  }
  return children;
}
