"use client";

import { BOOKING_STATUSES } from "@/lib/booking-status";
import { formatBookingStatus } from "@/lib/demo";
import type { BookingStatus } from "@/types/database";

function tabClass(selected: boolean) {
  return selected
    ? "rounded-full border border-[var(--lodgio-ink)] bg-[var(--lodgio-ink)] px-3 py-1 text-xs text-white"
    : "rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700";
}

export function BookingStatusFilters({
  value,
  onChange,
}: {
  value: BookingStatus | null;
  onChange: (status: BookingStatus | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onChange(null)} className={tabClass(value === null)}>
        All
      </button>
      {BOOKING_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onChange(status)}
          className={tabClass(value === status)}
        >
          {formatBookingStatus(status)}
        </button>
      ))}
    </div>
  );
}
