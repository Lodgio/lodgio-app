"use client";

import { useNavigationPending } from "@/components/navigation-pending";
import { AddCaretakerCard } from "@/components/add-caretaker-card";
import { AddPropertyCard } from "@/components/add-property-card";
import { ListCardSkeleton } from "@/components/list-card-skeleton";

function PendingRoute({ href }: { href: string }) {
  const path = href.split("?")[0];

  if (path === "/dashboard/properties") {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <AddPropertyCard />
        <ListCardSkeleton title="Your properties" />
      </div>
    );
  }

  if (path === "/dashboard/caretakers") {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <AddCaretakerCard />
        <ListCardSkeleton title="Your caretakers" />
      </div>
    );
  }

  if (path === "/dashboard/bookings") {
    return <ListCardSkeleton title="Bookings" />;
  }

  if (path === "/dashboard/submissions") {
    return <ListCardSkeleton title="Unmatched submissions" />;
  }

  if (path === "/dashboard/settings") {
    return <ListCardSkeleton title="Settings" />;
  }

  if (path === "/dashboard/onboarding") {
    return <ListCardSkeleton title="Onboarding" />;
  }

  return <ListCardSkeleton title="Overview" />;
}

export function DashboardMain({ children }: { children: React.ReactNode }) {
  const { isPending, pendingHref } = useNavigationPending();

  if (isPending && pendingHref) {
    return <PendingRoute href={pendingHref} />;
  }

  return children;
}
