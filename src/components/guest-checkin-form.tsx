"use client";

import { useState } from "react";
import { GuestIdFileField } from "@/components/guest-id-file-field";
import { IndianPhoneField } from "@/components/indian-phone-field";
import { createClient } from "@/lib/supabase/client";
import {
  reserveGuestDocumentUpload,
  submitGuestForm,
} from "@/app/[hostSlug]/checkin/actions";

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function Field({
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

export function GuestCheckinForm({
  hostId,
  hostSlug,
  hostName,
  defaultName,
  defaultPhone,
  defaultBooking,
  defaultIdType,
}: {
  hostId: string;
  hostSlug: string;
  hostName: string;
  defaultName?: string;
  defaultPhone?: string;
  defaultBooking?: string;
  defaultIdType: string;
}) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const form = event.currentTarget;
    const file = (form.elements.namedItem("idDocument") as HTMLInputElement | null)?.files?.[0];
    if (!file) {
      setError("Please upload a photo or PDF of your ID");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const reserved = await reserveGuestDocumentUpload({
        hostId,
        hostSlug,
        contentType: file.type,
        fileName: file.name,
        byteSize: file.size,
      });
      if (!reserved.ok) {
        setError(reserved.error);
        setSending(false);
        return;
      }

      const supabase = createClient();
      let uploaded = false;
      for (let attempt = 0; attempt < 2 && !uploaded; attempt += 1) {
        const { error: uploadError } = await supabase.storage
          .from("guest-documents")
          .uploadToSignedUrl(reserved.path, reserved.token, file, {
            contentType: reserved.contentType,
            upsert: false,
          });
        uploaded = !uploadError;
      }
      if (!uploaded) {
        setError("Could not upload the ID. Check your connection and try again.");
        setSending(false);
        return;
      }

      const body = new FormData(form);
      body.delete("idDocument");
      body.set("idDocumentPath", reserved.path);
      await submitGuestForm(body);
    } catch (caught) {
      if (isNextRedirect(caught)) throw caught;
      setError("Could not send the form. Please try again.");
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5">
      <input type="hidden" name="hostId" value={hostId} />
      <input type="hidden" name="hostSlug" value={hostSlug} />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900">How we can reach you</h2>
        <Field label="Your full name" hint="As it appears on your Airbnb booking.">
          <input
            name="name"
            required
            defaultValue={defaultName ?? ""}
            placeholder="e.g. Manish Kumar"
            className="field"
          />
        </Field>
        <IndianPhoneField
          name="whatsappNumber"
          label="WhatsApp number"
          required
          defaultValue={defaultPhone}
          hint="This must be a WhatsApp number — we send check-in details there."
        />
      </section>

      <section className="space-y-4 border-t border-zinc-100 pt-5">
        <h2 className="text-sm font-semibold text-zinc-900">Your booking</h2>
        <Field
          label="Airbnb confirmation code"
          hint='Find this in your Airbnb confirmation email or trip details — usually 10 characters, e.g. "HM2SJPMSJS".'
        >
          <input
            name="claimedAirbnbBookingId"
            required
            defaultValue={defaultBooking ?? ""}
            placeholder="e.g. HM2SJPMSJS"
            className="field"
            autoCapitalize="characters"
          />
        </Field>
      </section>

      <section className="space-y-4 border-t border-zinc-100 pt-5">
        <h2 className="text-sm font-semibold text-zinc-900">ID verification</h2>
        <p className="text-xs leading-relaxed text-zinc-500">
          Upload a clear photo or PDF of your Aadhaar or passport for the host&apos;s records.
        </p>
        <Field label="ID type">
          <select name="idDocumentType" required className="field" defaultValue={defaultIdType}>
            <option value="aadhaar">Aadhaar card</option>
            <option value="passport">Passport</option>
            <option value="other">Other government ID</option>
          </select>
        </Field>
        <GuestIdFileField />
      </section>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <p className="text-xs leading-relaxed text-zinc-400">
        By submitting, you agree to share this information with {hostName} only for your upcoming stay.
      </p>

      <button type="submit" className="btn-primary w-full" disabled={sending} aria-busy={sending}>
        {sending ? "Sending…" : "Send check-in details"}
      </button>
    </form>
  );
}
