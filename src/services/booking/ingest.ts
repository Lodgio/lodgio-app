import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken } from "@/lib/crypto/tokens";
import { getGmailClient } from "@/integrations";
import { prepareAirbnbEmail } from "@/integrations/gmail/email-utils";
import { parseAirbnbEmail } from "@/integrations/gmail/parser";
import { IntegrationError } from "@/integrations/types";
import { runMatchingForHost } from "@/services/matching/matching-service";
import { findPropertyByListingName } from "@/services/booking/property-booking-service";

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
      const prepared = prepareAirbnbEmail(email.body, email.receivedAt);
      if (prepared.emailType !== "confirmation") {
        continue;
      }

      const parsed = parseAirbnbEmail(prepared.text, email.id, {
        subject: prepared.subject,
        referenceDate: prepared.referenceDate,
      });
      if (parsed.parseIncomplete || !parsed.airbnbBookingId) {
        console.warn("parse_incomplete", { emailId: email.id });
        continue;
      }

      const property = findPropertyByListingName(properties ?? [], parsed.listingName);

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

      const { error } = await supabase.from("bookings").upsert(
        {
          host_id: connection.host_id,
          property_id: property?.id ?? null,
          guest_id: guestId ?? null,
          airbnb_booking_id: parsed.airbnbBookingId,
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
          listing_name: parsed.listingName,
          status: "awaiting_guest_form",
        },
        { onConflict: "host_id,airbnb_booking_id" }
      );

      if (!error) ingested += 1;
    }

    await supabase
      .from("gmail_connections")
      .update({
        sync_cursor: nextCursor.value,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    await runMatchingForHost(connection.host_id);
  } catch (error) {
    if (error instanceof IntegrationError && error.kind === "auth") {
      await supabase
        .from("gmail_connections")
        .update({ status: "needs_reconnect" })
        .eq("id", connection.id);
    }
    throw error;
  }

  return { connectionId, ingested };
}
