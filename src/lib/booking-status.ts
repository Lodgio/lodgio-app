import type { BookingStatus } from "@/types/database";

export const BOOKING_STATUSES: BookingStatus[] = [
  "ingested",
  "awaiting_guest_form",
  "matched",
  "messaging",
  "completed",
  "failed",
];

export function parseBookingStatus(value: string | undefined): BookingStatus | null {
  if (value && BOOKING_STATUSES.includes(value as BookingStatus)) {
    return value as BookingStatus;
  }
  return null;
}
