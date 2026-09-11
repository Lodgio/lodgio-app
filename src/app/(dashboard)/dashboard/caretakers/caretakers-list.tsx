import { Card } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { updateCaretaker } from "@/app/(dashboard)/dashboard/actions";
import { SubmitButton } from "@/components/submit-button";
import { IndianPhoneField } from "@/components/indian-phone-field";

export async function CaretakersList() {
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
    <Card title="Your caretakers">
      {(caretakers ?? []).length === 0 ? (
        <p className="text-sm text-zinc-500">No caretakers yet. Add one on the left.</p>
      ) : (
        <div className="space-y-3">
          {(caretakers ?? []).map((caretaker) => {
            const propertyId = caretakerPropertyMap.get(caretaker.id);
            const propertyName = propertyId ? propertyNameMap.get(propertyId) : undefined;
            return (
              <div key={caretaker.id} className="rounded-lg border border-zinc-100 p-4">
                <div className="font-medium">{caretaker.name}</div>
                <div className="text-sm text-zinc-500">{caretaker.phone}</div>
                <div className="mt-1 text-sm">Property: {propertyName ?? "Not assigned"}</div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-blue-600">Edit caretaker</summary>
                  <form action={updateCaretaker} className="mt-3 space-y-3">
                    <input type="hidden" name="caretaker_id" value={caretaker.id} />
                    <input type="hidden" name="error_path" value="/dashboard/caretakers" />
                    <input name="name" required defaultValue={caretaker.name} className="field" />
                    <IndianPhoneField
                      name="phone"
                      label="WhatsApp number"
                      required
                      defaultValue={caretaker.phone}
                    />
                    <select name="property_id" className="field" defaultValue={propertyId ?? ""}>
                      <option value="">Not assigned</option>
                      {(properties ?? []).map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.name}
                        </option>
                      ))}
                    </select>
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
