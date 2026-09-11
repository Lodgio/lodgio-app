import { Card, StatusBadge } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHost } from "@/lib/host";
import {
  assignBookingProperty,
  sendBookingMessages,
} from "@/app/(dashboard)/dashboard/bookings/actions";
import { isPhase12Demo } from "@/lib/demo";
import { getHostSetupWarnings } from "@/services/booking/property-booking-service";
import { SubmitButton } from "@/components/submit-button";
import { BookingStatusFilters } from "@/components/booking-status-filters";
import { ViewGuestIdButton } from "@/components/view-guest-id-button";
import type { BookingStatus, Tables } from "@/types/database";

function latestRecipientStatus(
  logs: Array<Pick<Tables<"message_log">, "booking_id" | "recipient_type" | "status">>,
  bookingId: string,
  recipientType: "guest" | "caretaker"
): "sent" | "failed" | "none" {
  const rows = logs.filter((log) => log.booking_id === bookingId && log.recipient_type === recipientType);
  if (rows.some((log) => ["queued", "sent", "delivered"].includes(log.status))) return "sent";
  if (rows.some((log) => log.status === "failed")) return "failed";
  return "none";
}

function WaStatus({ label, status }: { label: string; status: "sent" | "failed" | "none" }) {
  const text = status === "sent" ? "Sent" : status === "failed" ? "Failed" : "Not sent";
  const color =
    status === "sent" ? "text-emerald-700" : status === "failed" ? "text-red-700" : "text-zinc-500";
  return (
    <div className={`text-xs ${color}`}>
      {label}: {text}
    </div>
  );
}

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
  searchParams: Promise<{ status?: string; synced?: string; error?: string }>;
}) {
  const { status, synced, error } = await searchParams;
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
  const bookingIds = rows.map((b) => b.id);

  const airbnbIds = rows.map((b) => b.airbnb_booking_id).filter(Boolean);
  const [{ data: properties }, { data: guests }, { data: messageLogs }, { data: byBooking }, { data: byClaim }] =
    await Promise.all([
    supabase.from("properties").select("id, name").order("name"),
    guestIds.length
      ? supabase.from("guests").select("id, name, whatsapp_number").in("id", guestIds)
      : Promise.resolve({ data: [] as Array<Pick<Tables<"guests">, "id" | "name" | "whatsapp_number">> }),
    bookingIds.length
      ? supabase
          .from("message_log")
          .select("booking_id, recipient_type, template_kind, status")
          .in("booking_id", bookingIds)
      : Promise.resolve({ data: [] as Array<Pick<Tables<"message_log">, "booking_id" | "recipient_type" | "template_kind" | "status">> }),
    bookingIds.length
      ? supabase
          .from("form_submissions")
          .select("id, booking_id, id_document_path")
          .in("booking_id", bookingIds)
      : Promise.resolve({ data: [] as Array<{ id: string; booking_id: string | null; id_document_path: string }> }),
    airbnbIds.length
      ? supabase
          .from("form_submissions")
          .select("id, claimed_airbnb_booking_id, id_document_path")
          .in("claimed_airbnb_booking_id", airbnbIds)
      : Promise.resolve({
          data: [] as Array<{ id: string; claimed_airbnb_booking_id: string; id_document_path: string }>,
        }),
  ]);

  const submissionByBookingId = new Map(
    (byBooking ?? [])
      .filter((row) => row.booking_id && row.id_document_path)
      .map((row) => [row.booking_id as string, row])
  );
  const submissionByAirbnbId = new Map(
    (byClaim ?? [])
      .filter((row) => row.id_document_path)
      .map((row) => [row.claimed_airbnb_booking_id, row])
  );

  const retryableBookingIds = new Set<string>();
  const succeededKeys = new Set(
    (messageLogs ?? [])
      .filter((log) => ["queued", "sent", "delivered"].includes(log.status))
      .map((log) => `${log.booking_id}:${log.recipient_type}:${log.template_kind}`)
  );
  for (const log of messageLogs ?? []) {
    if (log.status !== "failed") continue;
    const key = `${log.booking_id}:${log.recipient_type}:${log.template_kind}`;
    if (!succeededKeys.has(key)) retryableBookingIds.add(log.booking_id);
  }

  const propertyMap = new Map((properties ?? []).map((p) => [p.id, p.name]));
  const guestMap = new Map((guests ?? []).map((g) => [g.id, g]));

  return (
    <div className="space-y-4">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {decodeURIComponent(error)}
          </p>
        ) : null}

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
          <p className="text-sm text-zinc-600">
            Parsed fields from Airbnb confirmation emails: booking ID, dates, guest, financials.
          </p>
        ) : null}

        <BookingStatusFilters />

        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-zinc-500">
                  <th className="py-2 pr-4">Booking</th>
                  <th className="py-2 pr-4">Guest</th>
                  <th className="py-2 pr-4">Property</th>
                  <th className="py-2 pr-4">Financials</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  const guest = b.guest_id ? guestMap.get(b.guest_id) : undefined;
                  const propertyName = b.property_id ? propertyMap.get(b.property_id) : undefined;
                  const submission =
                    submissionByBookingId.get(b.id) ?? submissionByAirbnbId.get(b.airbnb_booking_id);
                  const guestWa = latestRecipientStatus(messageLogs ?? [], b.id, "guest");
                  const caretakerWa = latestRecipientStatus(messageLogs ?? [], b.id, "caretaker");
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
                                <SubmitButton className="btn-secondary text-xs" pendingLabel="Assigning…">
                                  Assign
                                </SubmitButton>
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
                      <td className="py-3">
                        <StatusBadge status={b.status} />
                        <div className="mt-2 space-y-1">
                          <WaStatus label="Guest WA" status={guestWa} />
                          <WaStatus label="Caretaker WA" status={caretakerWa} />
                        </div>
                        {submission ? (
                          <div className="mt-2">
                            <ViewGuestIdButton submissionId={submission.id} />
                          </div>
                        ) : null}
                        {b.status === "matched" || retryableBookingIds.has(b.id) ? (
                          <form action={sendBookingMessages} className="mt-2">
                            <input type="hidden" name="booking_id" value={b.id} />
                            <SubmitButton className="btn-secondary text-xs" pendingLabel="Sending…">
                              {retryableBookingIds.has(b.id) ? "Retry messages" : "Send messages"}
                            </SubmitButton>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
  );
}
