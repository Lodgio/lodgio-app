import { google } from "googleapis";
import { createServiceClient } from "@/lib/supabase/service";
import { getSheetsClient } from "@/integrations";
import { decryptToken } from "@/lib/crypto/tokens";
import {
  createOAuthClientFromRefreshToken,
  scopesIncludeDriveFile,
} from "@/integrations/google/oauth";
import {
  InsufficientSheetsScopeError,
  isInsufficientScopeError,
} from "@/integrations/sheets/real";
import { spreadsheetUrl } from "@/services/sheets/sheets-links";

const HEADER_ROW = [
  "Booking ID",
  "Guest Name",
  "Property",
  "Check-in",
  "Check-out",
  "Nights",
  "Guests",
  "WhatsApp Number",
  "Amount Paid by Guest",
  "Payable to Host",
  "Payable to Airbnb",
  "Status",
  "Created At",
];

async function markSheetsNeedsReconnect(hostId: string) {
  const supabase = createServiceClient();
  await supabase
    .from("host_settings")
    .update({
      sheets_export_enabled: false,
      sheets_status: "needs_reconnect",
    })
    .eq("host_id", hostId);
}

async function getHostGoogleAuth(hostId: string) {
  const supabase = createServiceClient();
  const { data: connection } = await supabase
    .from("gmail_connections")
    .select("refresh_token, granted_scopes, status")
    .eq("host_id", hostId)
    .eq("status", "active")
    .maybeSingle();

  if (!connection) {
    throw new InsufficientSheetsScopeError("Connect Gmail before enabling Sheets export");
  }
  if (!scopesIncludeDriveFile(connection.granted_scopes)) {
    throw new InsufficientSheetsScopeError("drive.file scope not granted");
  }

  return {
    refreshToken: decryptToken(connection.refresh_token),
    grantedScopes: connection.granted_scopes,
  };
}

/** Create a Lodgio-managed spreadsheet under the host's Drive (drive.file). */
export async function ensureHostSpreadsheet(hostId: string): Promise<{
  spreadsheetId: string;
  url: string;
}> {
  const supabase = createServiceClient();
  const [{ data: settings }, { data: host }, auth] = await Promise.all([
    supabase.from("host_settings").select("sheets_spreadsheet_id").eq("host_id", hostId).single(),
    supabase.from("hosts").select("business_name").eq("id", hostId).single(),
    getHostGoogleAuth(hostId),
  ]);

  if (settings?.sheets_spreadsheet_id) {
    return {
      spreadsheetId: settings.sheets_spreadsheet_id,
      url: spreadsheetUrl(settings.sheets_spreadsheet_id),
    };
  }

  const title = `Lodgio Bookings — ${host?.business_name?.trim() || "Host"}`;
  const oauth = createOAuthClientFromRefreshToken(auth.refreshToken);
  const sheets = google.sheets({ version: "v4", auth: oauth });

  try {
    const created = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: [{ properties: { title: "Bookings" } }],
      },
    });

    const spreadsheetId = created.data.spreadsheetId;
    if (!spreadsheetId) {
      throw new Error("Google Sheets create returned no spreadsheetId");
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Bookings!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [HEADER_ROW] },
    });

    await supabase
      .from("host_settings")
      .update({
        sheets_spreadsheet_id: spreadsheetId,
        sheets_export_enabled: true,
        sheets_status: "active",
      })
      .eq("host_id", hostId);

    return { spreadsheetId, url: spreadsheetUrl(spreadsheetId) };
  } catch (error) {
    if (isInsufficientScopeError(error) || error instanceof InsufficientSheetsScopeError) {
      await markSheetsNeedsReconnect(hostId);
      throw new InsufficientSheetsScopeError(
        error instanceof Error ? error.message : "Insufficient Google Sheets scope"
      );
    }
    throw error;
  }
}

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

  if (!settings?.sheets_export_enabled) return;
  if (settings.sheets_status === "needs_reconnect") return;

  try {
    let spreadsheetId = settings.sheets_spreadsheet_id;
    if (!spreadsheetId) {
      const created = await ensureHostSpreadsheet(booking.host_id);
      spreadsheetId = created.spreadsheetId;
    }

    const auth = await getHostGoogleAuth(booking.host_id);
    const sheets = getSheetsClient();

    await sheets.appendBookingRow(
      {
        hostId: booking.host_id,
        spreadsheetId,
        refreshToken: auth.refreshToken,
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
  } catch (error) {
    if (error instanceof InsufficientSheetsScopeError || isInsufficientScopeError(error)) {
      await markSheetsNeedsReconnect(booking.host_id);
      console.error("sheets_export_scope_error", bookingId, error);
      return;
    }
    console.error("sheets_export_failed", bookingId, error);
  }
}

/** Export completed bookings that never got a sheet row (e.g. sheet enabled after complete). */
export async function exportPendingBookingsForHost(hostId: string): Promise<number> {
  const supabase = createServiceClient();
  const { data: settings } = await supabase
    .from("host_settings")
    .select("sheets_export_enabled, sheets_status, sheets_spreadsheet_id")
    .eq("host_id", hostId)
    .single();

  if (
    !settings?.sheets_export_enabled ||
    settings.sheets_status === "needs_reconnect" ||
    !settings.sheets_spreadsheet_id
  ) {
    return 0;
  }

  const { data: pending } = await supabase
    .from("bookings")
    .select("id")
    .eq("host_id", hostId)
    .eq("status", "completed")
    .is("sheets_exported_at", null);

  let exported = 0;
  for (const booking of pending ?? []) {
    await exportBookingToSheets(booking.id);
    const { data: updated } = await supabase
      .from("bookings")
      .select("sheets_exported_at")
      .eq("id", booking.id)
      .maybeSingle();
    if (updated?.sheets_exported_at) exported += 1;
  }
  return exported;
}
