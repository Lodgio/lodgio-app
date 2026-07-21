import { google } from "googleapis";
import type { BookingRow, HostConnection, SheetsClient } from "@/integrations/types";
import { env } from "@/lib/env";

export class RealSheetsClient implements SheetsClient {
  async appendBookingRow(host: HostConnection, row: BookingRow): Promise<void> {
    if (!host.spreadsheetId) {
      throw new Error("Missing spreadsheet ID");
    }

    const credentials = JSON.parse(env.googleServiceAccountKey);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: host.spreadsheetId,
      range: "Sheet1!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
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
        ]],
      },
    });
  }
}
