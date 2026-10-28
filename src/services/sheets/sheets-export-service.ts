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
import { isRejectedGoogleToken, googleErrorCode } from "@/integrations/google/token-errors";
import { disconnectHostGoogle } from "@/services/google/disconnect-google";
import { bookingsSheetFormatRequests } from "@/services/sheets/sheet-format";
import { formatCreatedAt, formatStayDate } from "@/lib/stay-date";

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

  if (!connection || !connection.refresh_token) {
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

    const sheetId = created.data.sheets?.[0]?.properties?.sheetId ?? 0;
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: bookingsSheetFormatRequests(sheetId, HEADER_ROW.length) },
      });
    } catch (formatError) {
      console.error("sheets_format_failed", spreadsheetId, googleErrorCode(formatError));
    }

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
    if (isRejectedGoogleToken(error)) {
      await disconnectHostGoogle(hostId);
      throw new Error("Google access was revoked. Connect Gmail again.");
    }
    if (isInsufficientScopeError(error) || error instanceof InsufficientSheetsScopeError) {
      await markSheetsNeedsReconnect(hostId);
      throw new InsufficientSheetsScopeError("Insufficient Google Sheets scope");
    }
    throw new Error("Could not create the export sheet");
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
        checkIn: formatStayDate(booking.check_in),
        checkOut: formatStayDate(booking.check_out),
        nights: booking.nights,
        guestCount: booking.guest_count,
        whatsappNumber: guest?.whatsapp_number ?? "",
        amountPaidByGuest: booking.amount_paid_by_guest,
        amountPayableToHost: booking.amount_payable_to_host,
        amountPayableToAirbnb: booking.amount_payable_to_airbnb,
        status: booking.status.replaceAll("_", " "),
        createdAt: formatCreatedAt(booking.created_at),
      }
    );

    await supabase
      .from("bookings")
      .update({ sheets_exported_at: new Date().toISOString() })
      .eq("id", bookingId);
  } catch (error) {
    if (isRejectedGoogleToken(error)) {
      await disconnectHostGoogle(booking.host_id);
      console.error("sheets_export_token_revoked", bookingId);
      return;
    }
    if (error instanceof InsufficientSheetsScopeError || isInsufficientScopeError(error)) {
      await markSheetsNeedsReconnect(booking.host_id);
      console.error("sheets_export_scope_error", bookingId, googleErrorCode(error));
      return;
    }
    console.error("sheets_export_failed", bookingId, googleErrorCode(error));
  }
}

function moneyCell(value: number | string | null | undefined): number | "" {
  if (value === null || value === undefined || value === "") return "";
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : "";
}

/**
 * One-time restyle of a sheet created before formatting existed.
 * Rewrites rows in place, matched by Booking ID, and leaves their order alone.
 */
export async function restyleHostSheet(hostId: string, spreadsheetId: string): Promise<number> {
  const supabase = createServiceClient();
  const auth = await getHostGoogleAuth(hostId);
  const oauth = createOAuthClientFromRefreshToken(auth.refreshToken);
  const sheets = google.sheets({ version: "v4", auth: oauth });

  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title),bandedRanges(bandedRangeId))",
  });
  const tab =
    meta.data.sheets?.find((sheet) => sheet.properties?.title === "Bookings") ??
    meta.data.sheets?.[0];
  const sheetId = tab?.properties?.sheetId ?? 0;
  const clearBands = (tab?.bandedRanges ?? [])
    .map((band) => band.bandedRangeId)
    .filter((id): id is number => typeof id === "number")
    .map((bandedRangeId) => ({ deleteBanding: { bandedRangeId } }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [...clearBands, ...bookingsSheetFormatRequests(sheetId, HEADER_ROW.length)],
    },
  });

  const [{ data: bookings }, listed] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "airbnb_booking_id, check_in, check_out, nights, guest_count, amount_paid_by_guest, amount_payable_to_host, amount_payable_to_airbnb, status, created_at, guest_id, property_id"
      )
      .eq("host_id", hostId),
    sheets.spreadsheets.values.get({ spreadsheetId, range: "Bookings!A2:A" }),
  ]);

  const guestIds = [...new Set((bookings ?? []).map((row) => row.guest_id).filter(Boolean))] as string[];
  const propertyIds = [...new Set((bookings ?? []).map((row) => row.property_id).filter(Boolean))] as string[];
  const [{ data: guests }, { data: properties }] = await Promise.all([
    guestIds.length
      ? supabase.from("guests").select("id, name, whatsapp_number").in("id", guestIds)
      : Promise.resolve({ data: [] }),
    propertyIds.length
      ? supabase.from("properties").select("id, name").in("id", propertyIds)
      : Promise.resolve({ data: [] }),
  ]);
  const guestById = new Map((guests ?? []).map((guest) => [guest.id, guest]));
  const propertyById = new Map((properties ?? []).map((property) => [property.id, property.name]));
  const bookingByAirbnbId = new Map((bookings ?? []).map((row) => [row.airbnb_booking_id, row]));

  const data = (listed.data.values ?? []).flatMap((row, index) => {
    const bookingId = String(row[0] ?? "").trim();
    const booking = bookingByAirbnbId.get(bookingId);
    if (!booking) return [];
    const guest = booking.guest_id ? guestById.get(booking.guest_id) : undefined;
    return [
      {
        range: `Bookings!A${index + 2}:M${index + 2}`,
        values: [
          [
            booking.airbnb_booking_id,
            guest?.name ?? "",
            (booking.property_id ? propertyById.get(booking.property_id) : "") ?? "",
            formatStayDate(booking.check_in),
            formatStayDate(booking.check_out),
            booking.nights,
            booking.guest_count,
            guest?.whatsapp_number ?? "",
            moneyCell(booking.amount_paid_by_guest),
            moneyCell(booking.amount_payable_to_host),
            moneyCell(booking.amount_payable_to_airbnb),
            booking.status.replaceAll("_", " "),
            formatCreatedAt(booking.created_at),
          ],
        ],
      },
    ];
  });

  if (data.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "USER_ENTERED", data },
    });
  }
  return data.length;
}

/** Existing Rehaish Maple sheet, created before formatting. Runs once from the mail poll. */
const RESTYLE_ONCE_HOST_ID = "f626cfad-4cf1-4e76-b17d-14df0b749321";

async function restyleHostSheetOnce(hostId: string, spreadsheetId: string) {
  const supabase = createServiceClient();
  const dedupeKey = `sheet_restyle:${hostId}`;
  const { data: existing } = await supabase
    .from("ops_events")
    .select("id")
    .eq("dedupe_key", dedupeKey)
    .limit(1);
  if (existing?.length) return;

  try {
    const updatedRows = await restyleHostSheet(hostId, spreadsheetId);
    await supabase.from("ops_events").insert({
      severity: "info",
      kind: "sheet_restyled",
      title: "Export sheet restyled",
      detail: `Updated ${updatedRows} existing rows`,
      host_id: hostId,
      dedupe_key: dedupeKey,
      payload: { updatedRows, spreadsheetId },
    });
  } catch (error) {
    console.error("sheets_restyle_failed", hostId, googleErrorCode(error));
    await supabase.from("ops_events").insert({
      severity: "warning",
      kind: "sheet_restyle_failed",
      title: "Export sheet restyle failed",
      detail: googleErrorCode(error),
      host_id: hostId,
      dedupe_key: `sheet_restyle_failed:${hostId}:${Date.now()}`,
      payload: {},
    });
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

  if (hostId === RESTYLE_ONCE_HOST_ID) {
    await restyleHostSheetOnce(hostId, settings.sheets_spreadsheet_id);
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
