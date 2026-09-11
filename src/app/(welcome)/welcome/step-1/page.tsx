import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHost } from "@/lib/host";
import { submitWhatsAppNumber, confirmWhatsAppReceived } from "@/app/(welcome)/welcome/actions";
import { SubmitButton } from "@/components/submit-button";
import { IndianPhoneField } from "@/components/indian-phone-field";

export default async function WelcomeStep1({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const host = await getCurrentHost();
  if (!host) redirect("/login");
  const params = await searchParams;

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("host_settings")
    .select("whatsapp_test_sent_at, whatsapp_verified_at")
    .eq("host_id", host.id)
    .maybeSingle();

  if (settings?.whatsapp_verified_at) redirect("/welcome/step-2");

  const messageSent = Boolean(settings?.whatsapp_test_sent_at) || params.sent === "1";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Step 1 of 2</p>
      <h2 className="mt-1 text-lg font-semibold">Verify your WhatsApp number</h2>
      <p className="mt-2 text-sm text-zinc-600">
        We send booking updates on WhatsApp. Enter your 10-digit number so we can check it works.
      </p>

      {params.error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {decodeURIComponent(params.error)}
        </p>
      ) : null}

      <form action={submitWhatsAppNumber} className="mt-5 space-y-3">
        <IndianPhoneField name="phone" label="Your WhatsApp number" required defaultValue={host.phone} />
        <SubmitButton
          className={`${messageSent ? "btn-secondary" : "btn-primary"} w-full`}
          pendingLabel="Sending…"
        >
          {messageSent ? "Resend welcome message" : "Send welcome message"}
        </SubmitButton>
      </form>

      {messageSent ? (
        <div className="mt-6 border-t border-zinc-100 pt-5">
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            We sent a welcome message to <strong>{host.phone}</strong> on WhatsApp.
          </p>
          <p className="mt-4 text-sm font-medium">Did you receive it?</p>
          <form action={confirmWhatsAppReceived} className="mt-2">
            <SubmitButton className="btn-primary w-full" pendingLabel="Continuing…">
              Yes, I received it
            </SubmitButton>
          </form>
          <p className="mt-2 text-xs text-zinc-500">Didn&apos;t get it? Check the number and resend.</p>
        </div>
      ) : null}
    </div>
  );
}
