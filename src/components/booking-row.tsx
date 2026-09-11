"use client";

import {
  assignBookingProperty,
  sendBookingMessages,
} from "@/app/(dashboard)/dashboard/bookings/actions";
import { bookingStatusColor, formatBookingStatus } from "@/lib/demo";
import { SubmitButton } from "@/components/submit-button";
import { ViewGuestIdButton } from "@/components/view-guest-id-button";
import type { BookingStatus } from "@/types/database";

export type BookingWaStatus = "sent" | "failed" | "none";

export type BookingRowModel = {
  id: string;
  status: BookingStatus;
  airbnbBookingId: string;
  checkIn: string | null;
  checkOut: string | null;
  listingName: string | null;
  propertyId: string | null;
  amountPaid: number | string | null;
  amountHost: number | string | null;
  guestName: string | null;
  guestPhone: string | null;
  propertyName: string | null;
  submissionId: string | null;
  guestWa: BookingWaStatus;
  caretakerWa: BookingWaStatus;
  retryable: boolean;
};

export type PropertyOption = { id: string; name: string };

function WaStatus({ label, status }: { label: string; status: BookingWaStatus }) {
  const text = status === "sent" ? "Sent" : status === "failed" ? "Failed" : "Not sent";
  const color =
    status === "sent" ? "text-emerald-700" : status === "failed" ? "text-red-700" : "text-zinc-500";
  return (
    <div className={`text-xs ${color}`}>
      {label}: {text}
    </div>
  );
}

export function BookingRow({
  row,
  properties,
}: {
  row: BookingRowModel;
  properties: PropertyOption[];
}) {
  return (
    <tr className="border-b border-zinc-100 align-top">
      <td className="py-3 pr-4">
        <div className="font-medium">{row.airbnbBookingId}</div>
        <div className="text-zinc-500">
          {row.checkIn} → {row.checkOut}
        </div>
      </td>
      <td className="py-3 pr-4">
        <div>{row.guestName ?? "—"}</div>
        <div className="text-zinc-500">{row.guestPhone ?? "—"}</div>
      </td>
      <td className="py-3 pr-4">
        {row.propertyName ? (
          row.propertyName
        ) : (
          <div className="space-y-2">
            <div className="text-amber-700">Unmapped</div>
            {row.listingName ? (
              <div className="text-xs text-zinc-500">Airbnb: {row.listingName}</div>
            ) : null}
            {properties.length > 0 ? (
              <form action={assignBookingProperty} className="flex gap-2">
                <input type="hidden" name="booking_id" value={row.id} />
                <select name="property_id" required className="field text-xs">
                  <option value="">Assign property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
                <SubmitButton className="btn-secondary text-xs" pendingLabel="Assigning…">
                  Assign
                </SubmitButton>
              </form>
            ) : (
              <a href="/dashboard/properties" className="text-xs text-blue-600">
                Add a property
              </a>
            )}
          </div>
        )}
      </td>
      <td className="py-3 pr-4">
        <div>Paid: {row.amountPaid ?? "—"}</div>
        <div>Host: {row.amountHost ?? "—"}</div>
      </td>
      <td className="py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${bookingStatusColor(row.status)}`}
        >
          {formatBookingStatus(row.status)}
        </span>
        <div className="mt-2 space-y-1">
          <WaStatus label="Guest WA" status={row.guestWa} />
          <WaStatus label="Caretaker WA" status={row.caretakerWa} />
        </div>
        {row.submissionId ? (
          <div className="mt-2">
            <ViewGuestIdButton submissionId={row.submissionId} />
          </div>
        ) : null}
        {row.status === "matched" || row.retryable ? (
          <form action={sendBookingMessages} className="mt-2">
            <input type="hidden" name="booking_id" value={row.id} />
            <SubmitButton className="btn-secondary text-xs" pendingLabel="Sending…">
              {row.retryable ? "Retry messages" : "Send messages"}
            </SubmitButton>
          </form>
        ) : null}
      </td>
    </tr>
  );
}
