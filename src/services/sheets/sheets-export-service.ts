import { createServiceClient } from "@/lib/supabase/service";
import { getSheetsClient } from "@/integrations";

export async function exportBookingToSheets(bookingId: string) {
  const supabase = createServiceClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.sheets_exported_at) return;

  const [{ data: settings }, { data: guest }, { data: property }] = await Promise.all([
    supabase.from("host_settings").select("*").eq("host_id", booking.host_id).single(),
    booking.guest_id
      ? supabase.from("guests").select("name, whatsapp_number").eq("id", booking.guest_id).maybeSingle()
      : Promise.resolve({ data: null }),
    booking.property_id
      ? supabase.from("properties").select("name").eq("id", booking.property_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!settings?.sheets_export_enabled || !settings.sheets_spreadsheet_id) return;

  const sheets = getSheetsClient();

  await sheets.appendBookingRow(
    {
      hostId: booking.host_id,
      spreadsheetId: settings.sheets_spreadsheet_id,
    },
    {
      bookingId: booking.airbnb_booking_id,
      guestName: guest?.name ?? "",
      propertyName: property?.name ?? "",
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      nights: booking.nights,
      guestCount: booking.guest_count,
      whatsappNumber: guest?.whatsapp_number ?? "",
      amountPaidByGuest: booking.amount_paid_by_guest,
      amountPayableToHost: booking.amount_payable_to_host,
      amountPayableToAirbnb: booking.amount_payable_to_airbnb,
      status: booking.status,
      createdAt: booking.created_at,
    }
  );

  await supabase
    .from("bookings")
    .update({ sheets_exported_at: new Date().toISOString() })
    .eq("id", bookingId);
}
