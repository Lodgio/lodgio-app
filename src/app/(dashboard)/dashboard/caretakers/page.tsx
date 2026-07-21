import { DashboardShell, Card } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { createCaretaker } from "@/app/(dashboard)/dashboard/actions";
import { assertFullModeRoute } from "@/lib/demo";

export default async function CaretakersPage() {
  assertFullModeRoute();
  const supabase = await createClient();
  const [{ data: caretakers }, { data: properties }, { data: mappings }] = await Promise.all([
    supabase.from("caretakers").select("*").order("name"),
    supabase.from("properties").select("id, name").order("name"),
    supabase.from("property_caretakers").select("property_id, caretaker_id"),
  ]);

  const propertyNameMap = new Map((properties ?? []).map((property) => [property.id, property.name]));
  const caretakerPropertyMap = new Map(
    (mappings ?? []).map((mapping) => [mapping.caretaker_id, mapping.property_id])
  );

  return (
    <DashboardShell title="Caretakers">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Add caretaker">
          <p className="mb-3 text-sm text-zinc-600">
            On-site contact for a property — they receive guest arrival details on WhatsApp.
          </p>
          <form action={createCaretaker} className="space-y-3">
            <input name="name" placeholder="Name" required className="field" />
            <input name="phone" placeholder="Phone (+91...)" required className="field" />
            <select name="property_id" className="field">
              <option value="">Map to property (optional)</option>
              {(properties ?? []).map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
            <button className="btn-primary">Save caretaker</button>
          </form>
        </Card>

        <Card title="Your caretakers">
          <div className="space-y-3">
            {(caretakers ?? []).map((caretaker) => {
              const propertyId = caretakerPropertyMap.get(caretaker.id);
              const propertyName = propertyId ? propertyNameMap.get(propertyId) : undefined;
              return (
                <div key={caretaker.id} className="rounded-lg border border-zinc-100 p-4">
                  <div className="font-medium">{caretaker.name}</div>
                  <div className="text-sm text-zinc-500">{caretaker.phone}</div>
                  <div className="mt-1 text-sm">
                    Property: {propertyName ?? "Not assigned"}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
