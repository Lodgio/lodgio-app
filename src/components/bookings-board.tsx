"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookingStatusFilters } from "@/components/booking-status-filters";
import { BookingRow, type BookingRowModel, type PropertyOption } from "@/components/booking-row";
import type { BookingStatus } from "@/types/database";

const PAGE_SIZE = 25;
const REFRESH_EVERY_MS = 15_000;

export function BookingsBoard({
  initialStatus,
  rows,
  properties,
  fetchedCount,
  totalCount,
}: {
  initialStatus: BookingStatus | null;
  rows: BookingRowModel[];
  properties: PropertyOption[];
  fetchedCount: number;
  totalCount: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<BookingStatus | null>(initialStatus);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const lastRefresh = useRef(0);

  useEffect(() => {
    setStatus(initialStatus);
    setVisible(PAGE_SIZE);
  }, [initialStatus]);

  useEffect(() => {
    function refreshIfStale() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefresh.current < REFRESH_EVERY_MS) return;
      lastRefresh.current = now;
      router.refresh();
    }

    lastRefresh.current = Date.now();
    window.addEventListener("focus", refreshIfStale);
    document.addEventListener("visibilitychange", refreshIfStale);
    return () => {
      window.removeEventListener("focus", refreshIfStale);
      document.removeEventListener("visibilitychange", refreshIfStale);
    };
  }, [router]);

  function selectStatus(next: BookingStatus | null) {
    setStatus(next);
    setVisible(PAGE_SIZE);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("status", next);
    else url.searchParams.delete("status");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  const filtered = useMemo(
    () => (status ? rows.filter((row) => row.status === status) : rows),
    [rows, status]
  );
  const shown = filtered.slice(0, visible);

  return (
    <div className="space-y-4">
      <BookingStatusFilters value={status} onChange={selectStatus} />

      {totalCount > fetchedCount ? (
        <p className="text-xs text-zinc-500">
          Showing the latest {fetchedCount} of {totalCount} bookings. Older stays stay in the
          database.
        </p>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-zinc-500">
                <th className="py-2 pr-4">Booking</th>
                <th className="py-2 pr-4">Guest</th>
                <th className="py-2 pr-4">Property</th>
                <th className="py-2 pr-4">Financials</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <BookingRow key={row.id} row={row} properties={properties} />
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 ? (
          <p className="pt-4 text-sm text-zinc-500">No bookings in this view.</p>
        ) : null}
        {filtered.length > visible ? (
          <button
            type="button"
            onClick={() => setVisible((count) => count + PAGE_SIZE)}
            className="btn-secondary mt-4"
          >
            Show more ({filtered.length - visible} left)
          </button>
        ) : null}
      </section>
    </div>
  );
}
