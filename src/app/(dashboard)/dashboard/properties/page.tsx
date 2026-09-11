import { Suspense } from "react";
import { assertFullModeRoute } from "@/lib/demo";
import { AddPropertyCard } from "@/components/add-property-card";
import { ListCardSkeleton } from "@/components/list-card-skeleton";
import { PropertiesList } from "./properties-list";

export default function PropertiesPage() {
  assertFullModeRoute();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <AddPropertyCard />
      <Suspense fallback={<ListCardSkeleton title="Your properties" />}>
        <PropertiesList />
      </Suspense>
    </div>
  );
}
