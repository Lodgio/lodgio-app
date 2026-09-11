import { createClient } from "@/lib/supabase/server";
import { getCurrentHost } from "@/lib/host";
import { isPhase12Demo } from "@/lib/demo";
import { getHostSetupWarnings } from "@/services/booking/property-booking-service";
import { BookingsBoard } from "@/components/bookings-board";
import { parseBookingStatus } from "@/lib/booking-status";
import type { BookingRowModel, BookingWaStatus } from "@/components/booking-row";
import type { Tables } from "@/types/database";

const FETCH_LIMIT = 200;

function latestRecipientStatus(
  logs: Array<Pick<Tables<"message_log">, "booking_id" | "recipient_type" | "status">>,
  bookingId: string,
  recipientType: "guest" | "caretaker"
): BookingWaStatus {
  const rows = logs.filter((log) => log.booking_id === bookingId && log.recipient_type === recipientType);
  if (rows.some((log) => ["queued", "sent", "delivered"].includes(log.status))) return "sent";
  if (rows.some((log) => log.status === "failed")) return "failed";
  return "none";
}

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

  const { data: bookings, count } = await supabase
    .from("bookings")
    .select("*", { count: "exact" })
    .order("check_in", { ascending: false })
    .limit(FETCH_LIMIT);
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
        : Promise.resolve({
            data: [] as Array<
              Pick<Tables<"message_log">, "booking_id" | "recipient_type" | "template_kind" | "status">
            >,
          }),
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
  const logs = messageLogs ?? [];

  const tableRows: BookingRowModel[] = rows.map((b) => {
    const guest = b.guest_id ? guestMap.get(b.guest_id) : undefined;
    const submission = submissionByBookingId.get(b.id) ?? submissionByAirbnbId.get(b.airbnb_booking_id);
    return {
      id: b.id,
      status: b.status,
      airbnbBookingId: b.airbnb_booking_id,
      checkIn: b.check_in,
      checkOut: b.check_out,
      listingName: b.listing_name,
      propertyId: b.property_id,
      amountPaid: b.amount_paid_by_guest,
      amountHost: b.amount_payable_to_host,
      guestName: guest?.name ?? null,
      guestPhone: guest?.whatsapp_number ?? null,
      propertyName: b.property_id ? (propertyMap.get(b.property_id) ?? null) : null,
      submissionId: submission?.id ?? null,
      guestWa: latestRecipientStatus(logs, b.id, "guest"),
      caretakerWa: latestRecipientStatus(logs, b.id, "caretaker"),
      retryable: retryableBookingIds.has(b.id),
    };
  });

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

      <BookingsBoard
        initialStatus={parseBookingStatus(status)}
        rows={tableRows}
        properties={properties ?? []}
        fetchedCount={rows.length}
        totalCount={count ?? rows.length}
      />
    </div>
  );
}
