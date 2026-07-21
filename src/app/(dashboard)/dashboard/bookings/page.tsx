import { DashboardShell, Card, StatusBadge } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHost } from "@/lib/host";
import { syncGmailNow } from "@/app/(dashboard)/dashboard/actions";
import {
  assignBookingProperty,
  loadBookingTestMessages,
  sendBookingMessages,
} from "@/app/(dashboard)/dashboard/bookings/actions";
import { TestMessagePreview } from "@/components/test-message-preview";
import { isPhase12Demo, formatBookingStatus } from "@/lib/demo";
import { getHostSetupWarnings } from "@/services/booking/property-booking-service";
import type { BookingStatus, Tables } from "@/types/database";

const BOOKING_STATUSES: BookingStatus[] = [
  "ingested",
  "awaiting_guest_form",
  "matched",
  "messaging",
  "completed",
  "failed",
];

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; synced?: string }>;
}) {
  const { status, synced } = await searchParams;
  const phase12 = isPhase12Demo();
  const host = await getCurrentHost();
  const supabase = await createClient();
  const setupWarnings = host ? await getHostSetupWarnings(host.id) : [];

  let bookingQuery = supabase.from("bookings").select("*").order("check_in", { ascending: false });
  if (status && BOOKING_STATUSES.includes(status as BookingStatus)) {
    bookingQuery = bookingQuery.eq("status", status as BookingStatus);
  }

  const { data: bookings } = await bookingQuery;
  const rows = bookings ?? [];

  const guestIds = [...new Set(rows.map((b) => b.guest_id).filter(Boolean))] as string[];

  const [{ data: properties }, { data: guests }] = await Promise.all([
    supabase.from("properties").select("id, name").order("name"),
    guestIds.length
      ? supabase.from("guests").select("id, name, whatsapp_number").in("id", guestIds)
      : Promise.resolve({ data: [] as Array<Pick<Tables<"guests">, "id" | "name" | "whatsapp_number">> }),
  ]);

  const propertyMap = new Map((properties ?? []).map((p) => [p.id, p.name]));
  const guestMap = new Map((guests ?? []).map((g) => [g.id, g]));

  return (
    <DashboardShell title="Bookings">
      <div className="space-y-4">
        {synced !== undefined ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Gmail sync complete — {synced} new booking{synced === "1" ? "" : "s"} imported.
          </p>
        ) : null}

        {setupWarnings.length && !phase12 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <ul className="space-y-1">
              {setupWarnings.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {phase12 ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-zinc-600">
              Parsed fields from Airbnb confirmation emails: booking ID, dates, guest, financials.
            </p>
            <form action={syncGmailNow}>
              <button type="submit" className="btn-secondary">
                Sync Gmail now
              </button>
            </form>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <a href="/dashboard/bookings" className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-white">
            All
          </a>
          {BOOKING_STATUSES.map((s) => (
            <a
              key={s}
              href={`/dashboard/bookings?status=${s}`}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs"
            >
              {formatBookingStatus(s)}
            </a>
          ))}
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-zinc-500">
                  <th className="py-2 pr-4">Booking</th>
                  <th className="py-2 pr-4">Guest</th>
                  <th className="py-2 pr-4">Property</th>
                  <th className="py-2 pr-4">Financials</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Messages</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  const guest = b.guest_id ? guestMap.get(b.guest_id) : undefined;
                  const propertyName = b.property_id ? propertyMap.get(b.property_id) : undefined;
                  return (
                    <tr key={b.id} className="border-b border-zinc-100 align-top">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{b.airbnb_booking_id}</div>
                        <div className="text-zinc-500">
                          {b.check_in} → {b.check_out}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div>{guest?.name ?? "—"}</div>
                        <div className="text-zinc-500">{guest?.whatsapp_number ?? "—"}</div>
                      </td>
                      <td className="py-3 pr-4">
                        {propertyName ? (
                          propertyName
                        ) : (
                          <div className="space-y-2">
                            <div className="text-amber-700">Unmapped</div>
                            {b.listing_name ? (
                              <div className="text-xs text-zinc-500">Airbnb: {b.listing_name}</div>
                            ) : null}
                            {(properties ?? []).length > 0 ? (
                              <form action={assignBookingProperty} className="flex gap-2">
                                <input type="hidden" name="booking_id" value={b.id} />
                                <select name="property_id" required className="field text-xs">
                                  <option value="">Assign property</option>
                                  {(properties ?? []).map((property) => (
                                    <option key={property.id} value={property.id}>
                                      {property.name}
                                    </option>
                                  ))}
                                </select>
                                <button type="submit" className="btn-secondary text-xs">
                                  Assign
                                </button>
                              </form>
                            ) : (
                              <a href="/dashboard/properties" className="text-xs text-blue-600">
                                Add a property
                              </a>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <div>Paid: {b.amount_paid_by_guest ?? "—"}</div>
                        <div>Host: {b.amount_payable_to_host ?? "—"}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={b.status} />
                        {b.status === "matched" ? (
                          <form action={sendBookingMessages} className="mt-2">
                            <input type="hidden" name="booking_id" value={b.id} />
                            <button type="submit" className="btn-secondary text-xs">
                              Send messages
                            </button>
                          </form>
                        ) : null}
                      </td>
                      <td className="py-3">
                        <TestMessagePreview
                          loadMessages={loadBookingTestMessages.bind(null, b.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
