import { notFound } from "next/navigation";
import { getHostBySlug, hostHasActiveGmail } from "@/lib/host";
import { submitGuestForm } from "@/app/[hostSlug]/checkin/actions";
import { TestMessagePreview } from "@/components/test-message-preview";
import { buildBookingMessages } from "@/services/messaging/message-preview";
import { getBookingMessagingReadiness } from "@/services/booking/property-booking-service";

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-800">{label}</label>
      {hint ? <p className="text-xs leading-relaxed text-zinc-500">{hint}</p> : null}
      {children}
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-zinc-100 pt-5 first:border-t-0 first:pt-0">
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default async function GuestCheckinPage({
  params,
  searchParams,
}: {
  params: Promise<{ hostSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string; bookingId?: string }>;
}) {
  const { hostSlug } = await params;
  const query = await searchParams;
  const host = await getHostBySlug(hostSlug);

  if (!host) notFound();

  const hasGmail = await hostHasActiveGmail(host.id);
  const hostName = host.business_name.trim() || "your host";

  if (query.success) {
    const readiness = query.bookingId
      ? await getBookingMessagingReadiness(query.bookingId)
      : { ready: false, reasons: [] };
    const messages =
      query.bookingId && readiness.ready
        ? await buildBookingMessages(query.bookingId, host.id)
        : [];
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <h1 className="text-xl font-semibold text-emerald-900">You&apos;re all set</h1>
          <p className="mt-2 text-sm text-emerald-800">
            {readiness.ready
              ? `${hostName} has your check-in details — location, caretaker contact, and arrival instructions will follow shortly.`
              : `${hostName} received your details. Check-in instructions will be sent once your host finishes property setup.`}
          </p>
          {messages.length ? (
            <div className="mt-5">
              <TestMessagePreview
                initialMessages={messages}
                autoOpen
                buttonLabel="Show test messages again"
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{hostName}</p>
        <h1 className="mt-1 text-xl font-semibold">Guest check-in</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          You received this link from {hostName} after booking on Airbnb. This one-time form lets
          them reach you with check-in details — Airbnb does not share your phone number with hosts.
        </p>
        {query.error ? (
          <p className="mt-3 text-sm text-red-600">{decodeURIComponent(query.error)}</p>
        ) : null}

        <form action={submitGuestForm} className="mt-6 space-y-5" encType="multipart/form-data">
          <input type="hidden" name="hostId" value={host.id} />
          <input type="hidden" name="hostSlug" value={hostSlug} />

          <FormSection title="How we can reach you">
            <FormField
              label="Your full name"
              hint="As it appears on your Airbnb booking."
            >
              <input name="name" required placeholder="e.g. Manish Kumar" className="field" />
            </FormField>

            <FormField
              label="Phone number"
              hint="We'll contact you here with directions and check-in info. Include country code (+91 for India)."
            >
              <input
                name="whatsappNumber"
                required
                defaultValue="+91"
                placeholder="+91 98765 43210"
                className="field"
                type="tel"
                autoComplete="tel"
              />
            </FormField>
          </FormSection>

          <FormSection title="Your booking">
            <FormField
              label="Airbnb confirmation code"
              hint='Find this in your Airbnb confirmation email or trip details — usually 10 characters, e.g. "HM2SJPMSJS".'
            >
              <input
                name="claimedAirbnbBookingId"
                required
                placeholder="e.g. HM2SJPMSJS"
                className="field"
                autoCapitalize="characters"
              />
            </FormField>
          </FormSection>

          <FormSection title="ID verification">
            <p className="text-xs leading-relaxed text-zinc-500">
              You can upload a copy of your ID now. This is optional during testing.
            </p>

            <FormField label="ID type">
              <select name="idDocumentType" required className="field">
                <option value="aadhaar">Aadhaar card</option>
                <option value="passport">Passport</option>
                <option value="other">Other government ID</option>
              </select>
            </FormField>

            <FormField
              label="Photo of your ID (optional)"
              hint="Upload a clear photo or PDF if available."
            >
              <input
                name="idDocument"
                type="file"
                accept="image/*,application/pdf"
                className="field file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-zinc-700"
              />
            </FormField>
          </FormSection>

          {!hasGmail ? (
            <FormSection title="Stay details">
              <p className="text-xs leading-relaxed text-zinc-500">
                {hostName} hasn&apos;t connected automated booking sync yet, so please enter your
                stay dates manually.
              </p>

              <FormField label="Check-in date">
                <input name="checkIn" type="date" required className="field" />
              </FormField>

              <FormField label="Check-out date">
                <input name="checkOut" type="date" required className="field" />
              </FormField>

              <FormField
                label="Number of guests"
                hint="Including yourself — as on your Airbnb booking."
              >
                <input
                  name="guestCount"
                  type="number"
                  min={1}
                  defaultValue={1}
                  required
                  className="field"
                />
              </FormField>
            </FormSection>
          ) : null}

          <p className="text-xs leading-relaxed text-zinc-400">
            By submitting, you agree to share this information with {hostName} only for your
            upcoming stay.
          </p>

          <button className="btn-primary w-full">Send check-in details</button>
        </form>
      </div>
    </div>
  );
}
