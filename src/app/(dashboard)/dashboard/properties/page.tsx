import { Suspense } from "react";
import { Card } from "@/components/dashboard-shell";
import { createProperty } from "@/app/(dashboard)/dashboard/actions";
import { assertFullModeRoute } from "@/lib/demo";
import { SubmitButton } from "@/components/submit-button";
import { PropertyFields } from "@/components/property-fields";
import { ListCardSkeleton } from "@/components/list-card-skeleton";
import { PropertiesList } from "./properties-list";

export default function PropertiesPage() {
  assertFullModeRoute();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Add property">
        <form action={createProperty} className="space-y-3">
          <PropertyFields />
          <SubmitButton className="btn-primary" pendingLabel="Saving…">
            Save property
          </SubmitButton>
        </form>
      </Card>

      <Suspense fallback={<ListCardSkeleton title="Your properties" />}>
        <PropertiesList />
      </Suspense>
    </div>
  );
}
