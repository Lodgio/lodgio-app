import { createServiceClient } from "@/lib/supabase/service";
import { getBookingCaretaker } from "@/services/messaging/message-preview";
import { processMatchedBooking } from "@/services/messaging/messaging-service";
import type { Tables } from "@/types/database";

export function normalizeListingName(name: string): string {
  return name.trim().toLowerCase();
}

export function findPropertyByListingName(
  properties: Array<Pick<Tables<"properties">, "id" | "name">>,
  listingName: string
) {
  const normalized = normalizeListingName(listingName);
  return properties.find((property) => normalizeListingName(property.name) === normalized);
}

export async function remapUnmappedBookingsForHost(hostId: string): Promise<number> {
  const supabase = createServiceClient();
  const [{ data: properties }, { data: bookings }] = await Promise.all([
    supabase.from("properties").select("id, name").eq("host_id", hostId),
    supabase
      .from("bookings")
      .select("id, listing_name")
      .eq("host_id", hostId)
      .is("property_id", null)
      .not("listing_name", "is", null),
  ]);

  if (!properties?.length || !bookings?.length) return 0;

  let remapped = 0;
  for (const booking of bookings) {
    if (!booking.listing_name) continue;
    const property = findPropertyByListingName(properties, booking.listing_name);
    if (!property) continue;

    const { error } = await supabase
      .from("bookings")
      .update({ property_id: property.id })
      .eq("id", booking.id);

    if (!error) remapped += 1;
  }

  return remapped;
}

export interface MessagingReadiness {
  ready: boolean;
  reasons: string[];
}

export async function getBookingMessagingReadiness(
  bookingId: string
): Promise<MessagingReadiness> {
  const supabase = createServiceClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("property_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { ready: false, reasons: ["Booking not found"] };

  const reasons: string[] = [];

  if (!booking.property_id) {
    reasons.push("Property is not mapped to this booking");
    return { ready: false, reasons };
  }

  const { data: property } = await supabase
    .from("properties")
    .select("name, location_url")
    .eq("id", booking.property_id)
    .maybeSingle();

  if (!property?.location_url?.trim()) {
    reasons.push(`Add a Google Maps link for ${property?.name ?? "this property"}`);
  }

  const caretaker = await getBookingCaretaker(booking.property_id);
  if (!caretaker) {
    reasons.push(`Assign a caretaker to ${property?.name ?? "this property"}`);
  }

  return { ready: reasons.length === 0, reasons };
}

export async function retryPendingMessagingForHost(hostId: string): Promise<number> {
  const supabase = createServiceClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id")
    .eq("host_id", hostId)
    .eq("status", "matched");

  let retried = 0;
  for (const booking of bookings ?? []) {
    const readiness = await getBookingMessagingReadiness(booking.id);
    if (!readiness.ready) continue;
    await processMatchedBooking(booking.id);
    retried += 1;
  }

  return retried;
}

export async function getHostSetupWarnings(hostId: string): Promise<string[]> {
  const supabase = createServiceClient();
  const warnings: string[] = [];

  const [{ count: unmappedCount }, { data: properties }, { data: mappings }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("host_id", hostId)
      .is("property_id", null),
    supabase.from("properties").select("id, name").eq("host_id", hostId),
    supabase.from("property_caretakers").select("property_id"),
  ]);

  if ((unmappedCount ?? 0) > 0) {
    warnings.push(
      `${unmappedCount} booking${unmappedCount === 1 ? "" : "s"} need a property — map the listing on Bookings`
    );
  }

  const mappedPropertyIds = new Set((mappings ?? []).map((mapping) => mapping.property_id));
  for (const property of properties ?? []) {
    if (!mappedPropertyIds.has(property.id)) {
      warnings.push(`Assign a caretaker to ${property.name}`);
    }
  }

  const { count: pendingMessagingCount } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("host_id", hostId)
    .eq("status", "matched");

  if ((pendingMessagingCount ?? 0) > 0) {
    warnings.push(
      `${pendingMessagingCount} matched booking${pendingMessagingCount === 1 ? "" : "s"} waiting to send messages`
    );
  }

  return warnings;
}
