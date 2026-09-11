import { Suspense } from "react";
import { assertFullModeRoute } from "@/lib/demo";
import { AddCaretakerCard } from "@/components/add-caretaker-card";
import { ListCardSkeleton } from "@/components/list-card-skeleton";
import { CaretakersList } from "./caretakers-list";
import { CaretakerPropertyOptions } from "./property-options";

export default function CaretakersPage() {
  assertFullModeRoute();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <AddCaretakerCard
        propertySelect={
          <Suspense
            fallback={
              <select disabled className="field">
                <option>Loading properties…</option>
              </select>
            }
          >
            <CaretakerPropertyOptions />
          </Suspense>
        }
      />
      <Suspense fallback={<ListCardSkeleton title="Your caretakers" />}>
        <CaretakersList />
      </Suspense>
    </div>
  );
}
