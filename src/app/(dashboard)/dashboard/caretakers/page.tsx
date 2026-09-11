import { Suspense } from "react";
import { Card } from "@/components/dashboard-shell";
import { createCaretaker } from "@/app/(dashboard)/dashboard/actions";
import { assertFullModeRoute } from "@/lib/demo";
import { SubmitButton } from "@/components/submit-button";
import { IndianPhoneField } from "@/components/indian-phone-field";
import { ListCardSkeleton } from "@/components/list-card-skeleton";
import { CaretakersList } from "./caretakers-list";
import { CaretakerPropertyOptions } from "./property-options";

export default function CaretakersPage() {
  assertFullModeRoute();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Add caretaker">
        <p className="mb-3 text-sm text-zinc-600">
          On-site contact for a property — they receive guest arrival details on WhatsApp.
        </p>
        <form action={createCaretaker} className="space-y-3">
          <input name="name" placeholder="Name" required className="field" />
          <IndianPhoneField name="phone" label="WhatsApp number" required />
          <Suspense
            fallback={
              <select disabled className="field">
                <option>Loading properties…</option>
              </select>
            }
          >
            <CaretakerPropertyOptions />
          </Suspense>
          <SubmitButton className="btn-primary" pendingLabel="Saving…">
            Save caretaker
          </SubmitButton>
        </form>
      </Card>

      <Suspense fallback={<ListCardSkeleton title="Your caretakers" />}>
        <CaretakersList />
      </Suspense>
    </div>
  );
}
