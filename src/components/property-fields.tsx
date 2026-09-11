const HOUSE_RULES_LABEL =
  "House Rules / Additional Information You Would Like to Share With Your Guests";

export function PropertyFields({
  defaults,
}: {
  defaults?: {
    name?: string;
    address?: string | null;
    location_url?: string | null;
    check_in_time?: string | null;
    house_rules?: string | null;
  };
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Listing name</label>
        <p className="text-xs text-zinc-500">Exactly as in Airbnb emails, e.g. Rehaish Maple.</p>
        <input
          name="name"
          required
          defaultValue={defaults?.name ?? ""}
          placeholder="Rehaish Maple"
          className="field"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Google Maps link</label>
        <p className="text-xs text-zinc-500">Precise pin for check-in — better than Airbnb&apos;s map.</p>
        <input
          name="location_url"
          required
          defaultValue={defaults?.location_url ?? ""}
          placeholder="https://maps.google.com/..."
          className="field"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">{HOUSE_RULES_LABEL}</label>
        <textarea
          name="house_rules"
          defaultValue={defaults?.house_rules ?? ""}
          placeholder="Quiet hours, parking, extra notes for guests"
          className="field"
          rows={3}
        />
      </div>
      <details className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-zinc-700">
          More details (optional)
        </summary>
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Address</label>
            <input
              name="address"
              defaultValue={defaults?.address ?? ""}
              placeholder="Street, city"
              className="field"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Check-in time</label>
            <input
              name="check_in_time"
              defaultValue={defaults?.check_in_time ?? "2:00 PM"}
              placeholder="2:00 PM"
              className="field"
            />
          </div>
        </div>
      </details>
    </div>
  );
}
