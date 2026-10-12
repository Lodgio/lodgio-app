import { google } from "googleapis";
import type { BookingRow, HostConnection, SheetsClient } from "@/integrations/types";
import { createOAuthClientFromRefreshToken } from "@/integrations/google/oauth";
import { isRejectedGoogleToken } from "@/integrations/google/token-errors";

const BOOKINGS_RANGE = "Bookings!A1";

export class InsufficientSheetsScopeError extends Error {
  constructor(message = "Google Sheets export is missing drive.file scope") {
    super(message);
    this.name = "InsufficientSheetsScopeError";
  }
}

function isInsufficientScopeError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as {
    code?: number | string;
    status?: number;
    message?: string;
    errors?: Array<{ reason?: string }>;
  };
  const code = Number(err.code ?? err.status ?? 0);
  const message = (err.message ?? "").toLowerCase();
  const reasons = (err.errors ?? []).map((e) => e.reason ?? "");
  return (
    code === 403 ||
    message.includes("insufficient") ||
    message.includes("access_denied") ||
    reasons.includes("insufficientPermissions") ||
    reasons.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT")
  );
}

export class RealSheetsClient implements SheetsClient {
  async appendBookingRow(host: HostConnection, row: BookingRow): Promise<void> {
    if (!host.spreadsheetId) {
      throw new Error("Missing spreadsheet ID");
    }
    if (!host.refreshToken) {
      throw new InsufficientSheetsScopeError("Missing Google OAuth refresh token for Sheets export");
    }

    const auth = createOAuthClientFromRefreshToken(host.refreshToken);
    const sheets = google.sheets({ version: "v4", auth });

    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: host.spreadsheetId,
        range: BOOKINGS_RANGE,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              row.bookingId,
              row.guestName,
              row.propertyName,
              row.checkIn,
              row.checkOut,
              row.nights,
              row.guestCount,
              row.whatsappNumber,
              row.amountPaidByGuest,
              row.amountPayableToHost,
              row.amountPayableToAirbnb,
              row.status,
              row.createdAt,
            ],
          ],
        },
      });
    } catch (error) {
      if (isRejectedGoogleToken(error)) {
        throw new Error("invalid_grant");
      }
      if (isInsufficientScopeError(error)) {
        throw new InsufficientSheetsScopeError("Insufficient Google Sheets scope");
      }
      throw new Error("Google Sheets request failed");
    }
  }
}

export { isInsufficientScopeError };
