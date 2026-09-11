import { Card } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { mapPropertyCaretaker, updateProperty } from "@/app/(dashboard)/dashboard/actions";
import { SubmitButton } from "@/components/submit-button";
import { PropertyFields } from "@/components/property-fields";
import type { Tables } from "@/types/database";

export async function PropertiesList() {
  const supabase = await createClient();
  const [{ data: properties }, { data: caretakers }, { data: mappings }] = await Promise.all([
    supabase.from("properties").select("*").order("name"),
    supabase.from("caretakers").select("id, name").order("name"),
    supabase.from("property_caretakers").select("property_id, caretaker_id"),
  ]);

  const caretakerNameMap = new Map((caretakers ?? []).map((c) => [c.id, c.name]));
  const propertyCaretakerMap = new Map(
    (mappings ?? []).map((m) => [m.property_id, m.caretaker_id])
  );

  return (
    <Card title="Your properties">
      {(properties ?? []).length === 0 ? (
        <p className="text-sm text-zinc-500">No properties yet. Add one on the left.</p>
      ) : (
        <div className="space-y-4">
          {(properties ?? []).map((p: Tables<"properties">) => {
            const caretakerId = propertyCaretakerMap.get(p.id);
            const caretakerName = caretakerId ? caretakerNameMap.get(caretakerId) : undefined;
            return (
              <div key={p.id} className="rounded-lg border border-zinc-100 p-4">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-zinc-500">{p.address}</div>
                <div className="mt-1 text-sm text-zinc-500">Check-in from {p.check_in_time}</div>
                <div className="mt-2 text-sm">Caretaker: {caretakerName ?? "Not assigned"}</div>
                {caretakers && caretakers.length > 0 ? (
                  <form action={mapPropertyCaretaker} className="mt-3 flex gap-2">
                    <input type="hidden" name="property_id" value={p.id} />
                    <select name="caretaker_id" className="field" defaultValue={caretakerId ?? ""}>
                      <option value="">Select caretaker</option>
                      {caretakers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <SubmitButton className="btn-secondary" pendingLabel="Assigning…">
                      Assign
                    </SubmitButton>
                  </form>
                ) : null}
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-blue-600">Edit property</summary>
                  <form action={updateProperty} className="mt-3 space-y-3">
                    <input type="hidden" name="property_id" value={p.id} />
                    <PropertyFields defaults={p} />
                    <SubmitButton className="btn-secondary" pendingLabel="Saving…">
                      Save changes
                    </SubmitButton>
                  </form>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
