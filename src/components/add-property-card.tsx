import { createProperty } from "@/app/(dashboard)/dashboard/actions";
import { PageCard } from "@/components/page-card";
import { PropertyFields } from "@/components/property-fields";
import { SubmitButton } from "@/components/submit-button";

export function AddPropertyCard() {
  return (
    <PageCard title="Add property">
      <form action={createProperty} className="space-y-3">
        <PropertyFields />
        <SubmitButton className="btn-primary" pendingLabel="Saving…">
          Save property
        </SubmitButton>
      </form>
    </PageCard>
  );
}
