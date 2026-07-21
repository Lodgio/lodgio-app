import { createServiceClient } from "@/lib/supabase/service";
import {
  renderMessageBody,
  type MessageBodyKind,
} from "@/integrations/whatsapp/message-bodies";
import type { Tables } from "@/types/database";

export interface BookingMessagePreview {
  kind: MessageBodyKind;
  title: string;
  recipient: string;
  body: string;
}

const UNKNOWN_TIME = "{{Check-in time}}";
const UNKNOWN_WEATHER = "{{Weather Summary}}";
const UNKNOWN_RECOMMENDATION = "{{Umbrella/Light Jacket/Sunscreen}}";
const AIRBNB_BOOKING_TYPE = "Online (Airbnb)";

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export async function buildBookingMessages(
  bookingId: string,
  expectedHostId?: string
): Promise<BookingMessagePreview[]> {
  const supabase = createServiceClient();
  let bookingQuery = supabase.from("bookings").select("*").eq("id", bookingId);
  if (expectedHostId) bookingQuery = bookingQuery.eq("host_id", expectedHostId);

  const { data: booking } = await bookingQuery.maybeSingle();
  if (!booking) return [];

  const [{ data: guest }, { data: property }, { data: mapping }] = await Promise.all([
    booking.guest_id
      ? supabase.from("guests").select("*").eq("id", booking.guest_id).maybeSingle()
      : Promise.resolve({ data: null as Tables<"guests"> | null }),
    booking.property_id
      ? supabase.from("properties").select("*").eq("id", booking.property_id).maybeSingle()
      : Promise.resolve({ data: null as Tables<"properties"> | null }),
    booking.property_id
      ? supabase
          .from("property_caretakers")
          .select("caretaker_id")
          .eq("property_id", booking.property_id)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null as { caretaker_id: string } | null }),
  ]);

  const { data: caretaker } = mapping?.caretaker_id
    ? await supabase.from("caretakers").select("*").eq("id", mapping.caretaker_id).maybeSingle()
    : { data: null as Tables<"caretakers"> | null };

  const sharedValues = {
    guest_name: guest?.name ?? "Guest",
    guest_phone: guest?.whatsapp_number ?? "{{Phone Number}}",
    property_name: property?.name ?? "Property",
    location_url: property?.location_url ?? "{{Google Maps Link}}",
    caretaker_name: caretaker?.name ?? "{{Caretaker Name}}",
    caretaker_phone: caretaker?.phone ?? "{{Phone Number}}",
    check_in: formatDate(booking.check_in),
    check_out: formatDate(booking.check_out),
    check_in_time:
      booking.check_in_time ?? property?.check_in_time ?? UNKNOWN_TIME,
    weather_summary: UNKNOWN_WEATHER,
    weather_recommendation: UNKNOWN_RECOMMENDATION,
    nights: booking.nights,
    guest_count: booking.guest_count,
    booking_type: AIRBNB_BOOKING_TYPE,
  };

  const messages: BookingMessagePreview[] = [
    {
      kind: "guest_welcome",
      title: "Message to guest",
      recipient: guest?.whatsapp_number ?? "Guest WhatsApp number",
      body: renderMessageBody("guest_welcome", sharedValues),
    },
  ];

  if (caretaker) {
    messages.push({
      kind: "caretaker_notify",
      title: "Message to caretaker",
      recipient: caretaker.phone,
      body: renderMessageBody("caretaker_notify", sharedValues),
    });
  }

  return messages;
}

export async function getBookingCaretaker(
  propertyId: string | null
): Promise<Pick<Tables<"caretakers">, "name" | "phone"> | null> {
  if (!propertyId) return null;
  const supabase = createServiceClient();
  const { data: mapping } = await supabase
    .from("property_caretakers")
    .select("caretaker_id")
    .eq("property_id", propertyId)
    .limit(1)
    .maybeSingle();
  if (!mapping?.caretaker_id) return null;

  const { data } = await supabase
    .from("caretakers")
    .select("name, phone")
    .eq("id", mapping.caretaker_id)
    .maybeSingle();
  return data;
}
