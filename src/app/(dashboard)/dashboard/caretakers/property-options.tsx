import { createClient } from "@/lib/supabase/server";

export async function CaretakerPropertyOptions() {
  const supabase = await createClient();
  const { data: properties } = await supabase.from("properties").select("id, name").order("name");

  return (
    <select name="property_id" className="field">
      <option value="">Map to property (optional)</option>
      {(properties ?? []).map((property) => (
        <option key={property.id} value={property.id}>
          {property.name}
        </option>
      ))}
    </select>
  );
}
