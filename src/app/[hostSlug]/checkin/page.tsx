import { notFound } from "next/navigation";
import { getHostBySlug } from "@/lib/host";
import { submitGuestForm } from "@/app/[hostSlug]/checkin/actions";
import { getBookingMessagingReadiness } from "@/services/booking/property-booking-service";
import { SubmitButton } from "@/components/submit-button";
import { IndianPhoneField } from "@/components/indian-phone-field";
import { LodgioLogo } from "@/components/lodgio-logo";

/** Pilot: hide stay-details. ID upload is required. */
const SHOW_ID_VERIFICATION = true;
const SHOW_STAY_DETAILS = false;

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

        <form action={submitGuestForm} className="mt-6 space-y-5" encType="multipart/form-data">
          <input type="hidden" name="hostId" value={host.id} />
          <input type="hidden" name="hostSlug" value={hostSlug} />

          <FormSection title="How we can reach you">
            <FormField label="Your full name" hint="As it appears on your Airbnb booking.">
              <input
                name="name"
                required
                defaultValue={query.name ?? ""}
                placeholder="e.g. Manish Kumar"
                className="field"
              />
            </FormField>

            <IndianPhoneField
              name="whatsappNumber"
              label="WhatsApp number"
              required
              defaultValue={query.phone}
              hint="This must be a WhatsApp number — we send check-in details there."
            />
          </FormSection>

          <FormSection title="Your booking">
            <FormField
              label="Airbnb confirmation code"
              hint='Find this in your Airbnb confirmation email or trip details — usually 10 characters, e.g. "HM2SJPMSJS".'
            >
              <input
                name="claimedAirbnbBookingId"
                required
                defaultValue={query.booking ?? ""}
                placeholder="e.g. HM2SJPMSJS"
                className="field"
                autoCapitalize="characters"
              />
            </FormField>
          </FormSection>

          {SHOW_ID_VERIFICATION ? (
            <FormSection title="ID verification">
              <p className="text-xs leading-relaxed text-zinc-500">
                Upload a clear photo or PDF of your Aadhaar or passport for the host&apos;s records.
              </p>

              <FormField label="ID type">
                <select name="idDocumentType" required className="field" defaultValue={idType}>
                  <option value="aadhaar">Aadhaar card</option>
                  <option value="passport">Passport</option>
                  <option value="other">Other government ID</option>
                </select>
              </FormField>

              <FormField
                label="Photo or PDF of your ID"
                hint="Required. JPEG, PNG, WebP, PDF, or an iPhone photo, up to 10 MB."
              >
                <input
                  name="idDocument"
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.heic,.heif"
                  className="field file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-zinc-700"
                />
              </FormField>
            </FormSection>
          ) : null}

          {SHOW_STAY_DETAILS ? (
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

          <SubmitButton className="btn-primary w-full" pendingLabel="Sending…">
            Send check-in details
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
