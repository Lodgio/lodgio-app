import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken } from "@/lib/crypto/tokens";
import { getGmailClient } from "@/integrations";
import { prepareAirbnbEmail } from "@/integrations/gmail/email-utils";
import { parseAirbnbEmail } from "@/integrations/gmail/parser";
import { IntegrationError } from "@/integrations/types";
import { runMatchingForHost } from "@/services/matching/matching-service";
import { findPropertyFromEmail } from "@/services/booking/property-booking-service";
import { recordOpsEvent } from "@/lib/ops";

export async function pollAllGmailConnections() {
  const supabase = createServiceClient();
  const { data: connections } = await supabase
    .from("gmail_connections")
    .select("*")
    .eq("status", "active");

  const results = [];
  for (const connection of connections ?? []) {
    results.push(await pollGmailConnection(connection.id));
  }
  return results;
}

export async function pollGmailConnection(connectionId: string) {
  const supabase = createServiceClient();
  const { data: connection } = await supabase
    .from("gmail_connections")
    .select("*")
    .eq("id", connectionId)
    .single();

  if (!connection || connection.status !== "active") {
    return { connectionId, ingested: 0 };
  }

  const gmail = getGmailClient();
  let ingested = 0;

  try {
    const refreshToken = decryptToken(connection.refresh_token);
    const { emails, nextCursor } = await gmail.listAirbnbMessages(
      { hostId: connection.host_id, refreshToken },
      { value: connection.sync_cursor }
    );

    const { data: properties } = await supabase
      .from("properties")
      .select("id, name")
      .eq("host_id", connection.host_id);

    for (const email of emails) {
      const prepared = prepareAirbnbEmail(email.body, email.receivedAt, email.subject);
      if (prepared.emailType !== "confirmation") {
        continue;
      }

      const parsed = parseAirbnbEmail(prepared.text, email.id, {
        subject: prepared.subject,
        referenceDate: prepared.referenceDate,
      });
      const listingOnlyIncomplete =
        Boolean(parsed.parseIncomplete) &&
        (parsed.parseIssues ?? []).every((issue) => issue.startsWith("listingName:"));
      if (!parsed.airbnbBookingId || (parsed.parseIncomplete && !listingOnlyIncomplete)) {
        console.warn("parse_incomplete", {
          emailId: email.id,
          subject: prepared.subject,
          issues: parsed.parseIssues,
          bookingId: parsed.airbnbBookingId,
          listingName: parsed.listingName,
          checkIn: parsed.checkIn,
          checkOut: parsed.checkOut,
        });
        await recordOpsEvent({
          severity: "warning",
          kind: "gmail_parse_failed",
          title: "Airbnb email did not parse",
          detail: `${prepared.subject ?? "No subject"} — ${(parsed.parseIssues ?? []).join(", ") || "missing booking id"}`,
          hostId: connection.host_id,
          dedupeKey: `gmail_parse_failed:${connection.host_id}`,
          email: true,
          payload: {
            emailId: email.id,
            subject: prepared.subject ?? null,
            issues: parsed.parseIssues ?? [],
          },
        });
        continue;
      }

      const property = findPropertyFromEmail(
        properties ?? [],
        parsed.listingName,
        prepared.text
      );
      const listingName = property?.name ?? parsed.listingName;
      if (!listingName) {
        console.warn("parse_incomplete", {
          emailId: email.id,
          subject: prepared.subject,
          issues: parsed.parseIssues ?? ["listingName: Required"],
          bookingId: parsed.airbnbBookingId,
          listingName: parsed.listingName,
          checkIn: parsed.checkIn,
          checkOut: parsed.checkOut,
        });
        await recordOpsEvent({
          severity: "warning",
          kind: "gmail_parse_failed",
          title: "Airbnb email missing listing name",
          detail: prepared.subject ?? parsed.airbnbBookingId,
          hostId: connection.host_id,
          dedupeKey: `gmail_parse_failed:${connection.host_id}`,
          email: true,
          payload: { emailId: email.id, subject: prepared.subject ?? null },
        });
        continue;
      }

      const { data: existingGuest } = await supabase
        .from("guests")
        .upsert(
          {
            host_id: connection.host_id,
            relay_email:
              parsed.relayEmail ?? `${parsed.airbnbBookingId}@airbnb.pending`,
            name: parsed.guestName,
          },
          { onConflict: "host_id,relay_email" }
        )
        .select("id")
        .maybeSingle();

      const guestId = existingGuest?.id;

      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("id, status, guest_id, property_id")
        .eq("host_id", connection.host_id)
        .eq("airbnb_booking_id", parsed.airbnbBookingId)
        .maybeSingle();

      const parsedFields = {
        check_in: parsed.checkIn,
        check_out: parsed.checkOut,
        check_in_time: parsed.checkInTime,
        check_out_time: parsed.checkOutTime,
        nights: parsed.nights,
        guest_count: parsed.guestCount,
        amount_paid_by_guest: parsed.amountPaidByGuest,
        amount_payable_to_host: parsed.amountPayableToHost,
        amount_payable_to_airbnb: parsed.amountPayableToAirbnb,
        guest_notes: parsed.guestNotes,
        raw_email_ref: parsed.rawEmailRef,
        listing_name: listingName,
      };

      if (existingBooking) {
        // Never reset workflow status / linked guest on re-ingest of the same confirmation.
        const { error } = await supabase
          .from("bookings")
          .update({
            ...parsedFields,
            property_id: existingBooking.property_id ?? property?.id ?? null,
            guest_id: existingBooking.guest_id ?? guestId ?? null,
          })
          .eq("id", existingBooking.id);
        if (error) {
          console.error("booking_reingest_update_failed", parsed.airbnbBookingId, error);
          await recordOpsEvent({
            severity: "critical",
            kind: "booking_ingest_failed",
            title: "Booking update failed",
            detail: `${parsed.airbnbBookingId}: ${error.message}`,
            hostId: connection.host_id,
            dedupeKey: `booking_ingest_failed:${parsed.airbnbBookingId}`,
            payload: { airbnbBookingId: parsed.airbnbBookingId, error: error.message },
          });
        }
      } else {
        const { error } = await supabase.from("bookings").insert({
          host_id: connection.host_id,
          property_id: property?.id ?? null,
          guest_id: guestId ?? null,
          airbnb_booking_id: parsed.airbnbBookingId,
          ...parsedFields,
          status: "awaiting_guest_form",
        });

        if (!error) ingested += 1;
        else {
          console.error("booking_ingest_insert_failed", parsed.airbnbBookingId, error);
          await recordOpsEvent({
            severity: "critical",
            kind: "booking_ingest_failed",
            title: "Booking insert failed",
            detail: `${parsed.airbnbBookingId}: ${error.message}`,
            hostId: connection.host_id,
            dedupeKey: `booking_ingest_failed:${parsed.airbnbBookingId}`,
            payload: { airbnbBookingId: parsed.airbnbBookingId, error: error.message },
          });
        }
      }
    }

    await supabase
      .from("gmail_connections")
      .update({
        sync_cursor: nextCursor.value,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    await runMatchingForHost(connection.host_id);
    const { exportPendingBookingsForHost } = await import(
      "@/services/sheets/sheets-export-service"
    );
    await exportPendingBookingsForHost(connection.host_id);
  } catch (error) {
    if (error instanceof IntegrationError && error.kind === "auth") {
      await supabase
        .from("gmail_connections")
        .update({ status: "needs_reconnect" })
        .eq("id", connection.id);
      await recordOpsEvent({
        severity: "critical",
        kind: "gmail_needs_reconnect",
        title: "Gmail needs reconnect",
        detail: `${connection.email_address} lost Google access`,
        hostId: connection.host_id,
        dedupeKey: `gmail_needs_reconnect:${connection.id}`,
        payload: { email: connection.email_address },
      });
    }
    throw error;
  }

  return { connectionId, ingested };
}
