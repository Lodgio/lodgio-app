import type { ReactNode } from "react";
import { createCaretaker } from "@/app/(dashboard)/dashboard/actions";
import { IndianPhoneField } from "@/components/indian-phone-field";
import { PageCard } from "@/components/page-card";
import { SubmitButton } from "@/components/submit-button";

export function AddCaretakerCard({ propertySelect }: { propertySelect?: ReactNode }) {
  return (
    <PageCard title="Add caretaker">
      <p className="mb-3 text-sm text-zinc-600">
        On-site contact for a property — they receive guest arrival details on WhatsApp.
      </p>
      <form action={createCaretaker} className="space-y-3">
        <input name="name" placeholder="Name" required className="field" />
        <IndianPhoneField name="phone" label="WhatsApp number" required />
        {propertySelect ?? (
          <select disabled className="field">
            <option>Loading properties…</option>
          </select>
        )}
        <SubmitButton className="btn-primary" pendingLabel="Saving…">
          Save caretaker
        </SubmitButton>
      </form>
    </PageCard>
  );
}
