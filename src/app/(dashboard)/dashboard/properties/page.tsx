import { DashboardShell, Card } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { createProperty, mapPropertyCaretaker } from "@/app/(dashboard)/dashboard/actions";
import { assertFullModeRoute } from "@/lib/demo";
import type { Tables } from "@/types/database";

export default async function PropertiesPage() {
  assertFullModeRoute();
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
    <DashboardShell title="Properties">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Add property">
          <form action={createProperty} className="space-y-3">
            <input name="name" placeholder="Listing name (as in Airbnb emails)" required className="field" />
            <input name="address" placeholder="Address" className="field" />
            <input name="location_url" placeholder="Google Maps URL" className="field" />
            <input
              name="check_in_time"
              placeholder="Check-in time (e.g. 2:00 PM)"
              defaultValue="2:00 PM"
              className="field"
            />
            <textarea name="house_rules" placeholder="House rules" className="field" rows={3} />
            <button className="btn-primary">Save property</button>
          </form>
        </Card>

        <Card title="Your properties">
          <div className="space-y-4">
            {(properties ?? []).map((p: Tables<"properties">) => {
              const caretakerId = propertyCaretakerMap.get(p.id);
              const caretakerName = caretakerId ? caretakerNameMap.get(caretakerId) : undefined;
              return (
                <div key={p.id} className="rounded-lg border border-zinc-100 p-4">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-zinc-500">{p.address}</div>
                  <div className="mt-1 text-sm text-zinc-500">
                    Check-in from {p.check_in_time}
                  </div>
                  <div className="mt-2 text-sm">
                    Caretaker: {caretakerName ?? "Not assigned"}
                  </div>
                  {caretakers && caretakers.length > 0 ? (
                    <form action={mapPropertyCaretaker} className="mt-3 flex gap-2">
                      <input type="hidden" name="property_id" value={p.id} />
                      <select name="caretaker_id" className="field" defaultValue={caretakerId ?? ""}>
                        <option value="">Select caretaker</option>
                        {caretakers.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <button className="btn-secondary">Assign</button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
