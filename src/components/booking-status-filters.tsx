"use client";

import { Suspense } from "react";
import { NavLink } from "@/components/nav-link";
import { formatBookingStatus } from "@/lib/demo";
import type { BookingStatus } from "@/types/database";

const BOOKING_STATUSES: BookingStatus[] = [
  "ingested",
  "awaiting_guest_form",
  "matched",
  "messaging",
  "completed",
  "failed",
];

function Filters() {
  return (
    <div className="flex flex-wrap gap-2">
      <NavLink
        href="/dashboard/bookings"
        exact
        className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700"
        activeClassName="border-[var(--lodgio-ink)] bg-[var(--lodgio-ink)] !text-white"
        pendingClassName="animate-pulse opacity-50"
      >
        All
      </NavLink>
      {BOOKING_STATUSES.map((s) => (
        <NavLink
          key={s}
          href={`/dashboard/bookings?status=${s}`}
          exact
          className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700"
          activeClassName="border-[var(--lodgio-ink)] bg-[var(--lodgio-ink)] !text-white"
          pendingClassName="animate-pulse opacity-50"
        >
          {formatBookingStatus(s)}
        </NavLink>
      ))}
    </div>
  );
}

export function BookingStatusFilters() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--lodgio-ink)] px-3 py-1 text-xs text-white">All</span>
          {BOOKING_STATUSES.map((s) => (
            <span
              key={s}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-400"
            >
              {formatBookingStatus(s)}
            </span>
          ))}
        </div>
      }
    >
      <Filters />
    </Suspense>
  );
}
