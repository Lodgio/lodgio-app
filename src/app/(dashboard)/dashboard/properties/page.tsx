import { Suspense } from "react";
import { assertFullModeRoute } from "@/lib/demo";
import { AddPropertyCard } from "@/components/add-property-card";
import { ListCardSkeleton } from "@/components/list-card-skeleton";
import { PropertiesList } from "./properties-list";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  assertFullModeRoute();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {saved === "1" ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 lg:col-span-2">
          Property saved.
        </p>
      ) : null}
      <AddPropertyCard />
      <Suspense fallback={<ListCardSkeleton title="Your properties" />}>
        <PropertiesList />
      </Suspense>
    </div>
  );
}
