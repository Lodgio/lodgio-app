import { notFound } from "next/navigation";
import { getHostBySlug } from "@/lib/host";
import { getBookingMessagingReadiness } from "@/services/booking/property-booking-service";
import { LodgioLogo } from "@/components/lodgio-logo";
import { GuestCheckinForm } from "@/components/guest-checkin-form";

export const maxDuration = 60;

export default async function GuestCheckinPage({
  params,
  searchParams,
}: {
  params: Promise<{ hostSlug: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
    bookingId?: string;
    name?: string;
    phone?: string;
    booking?: string;
    idType?: string;
  }>;
}) {
  const { hostSlug } = await params;
  const query = await searchParams;
  const host = await getHostBySlug(hostSlug);

  if (!host) notFound();

  const hostName = host.business_name.trim() || "your host";

  if (query.success) {
    const readiness = query.bookingId
      ? await getBookingMessagingReadiness(query.bookingId)
      : { ready: false, reasons: [] };
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center bg-[var(--lodgio-cream)] px-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <h1 className="text-xl font-semibold text-emerald-900">You&apos;re all set</h1>
          <p className="mt-2 text-sm text-emerald-800">
            {readiness.ready
              ? `${hostName} has your check-in details — location, caretaker contact, and arrival instructions will follow shortly.`
              : `${hostName} received your details. Check-in instructions will be sent once your host finishes property setup.`}
          </p>
        </div>
      </div>
    );
  }

  const idType =
    query.idType === "passport" || query.idType === "other" || query.idType === "aadhaar"
      ? query.idType
      : "aadhaar";

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center bg-[var(--lodgio-cream)] px-4 py-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <LodgioLogo href="https://lodgio.in" />
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">{hostName}</p>
        <h1 className="mt-1 text-xl font-semibold text-[var(--lodgio-olive)]">Guest check-in</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          You received this link from {hostName} after booking on Airbnb. This one-time form lets
          them reach you with check-in details — Airbnb does not share your phone number with hosts.
        </p>
        {query.error ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {decodeURIComponent(query.error)}
          </p>
        ) : null}

        <GuestCheckinForm
          hostId={host.id}
          hostSlug={hostSlug}
          hostName={hostName}
          defaultName={query.name}
          defaultPhone={query.phone}
          defaultBooking={query.booking}
          defaultIdType={idType}
        />
      </div>
    </div>
  );
}
