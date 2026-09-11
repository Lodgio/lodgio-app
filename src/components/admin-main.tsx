"use client";

import { AdminPageFallback } from "@/components/admin-page-fallback";
import { useNavigationPending } from "@/components/navigation-pending";

export function AdminMain({ children }: { children: React.ReactNode }) {
  const { isPending, pendingHref } = useNavigationPending();

  if (isPending && pendingHref) {
    return <AdminPageFallback href={pendingHref} />;
  }

  return children;
}
