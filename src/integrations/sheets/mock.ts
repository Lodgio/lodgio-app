import type { BookingRow, HostConnection, SheetsClient } from "@/integrations/types";

export class MockSheetsClient implements SheetsClient {
  async appendBookingRow(host: HostConnection, row: BookingRow): Promise<void> {
    console.info("[MockSheets] append row", { hostId: host.hostId, row });
  }
}
