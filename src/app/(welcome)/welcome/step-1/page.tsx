import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHost } from "@/lib/host";
import { submitWhatsAppNumber, confirmWhatsAppReceived } from "@/app/(welcome)/welcome/actions";
import { TestMessagePreview } from "@/components/test-message-preview";
import { MESSAGE_BODIES } from "@/integrations/whatsapp/message-bodies";

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
  const welcomePreview = [
    {
      kind: "host_welcome" as const,
      title: "Welcome message to host",
      recipient: host.phone || "Your WhatsApp number",
      body: MESSAGE_BODIES.host_welcome,
    },
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Step 1 of 2</p>
      <h2 className="mt-1 text-lg font-semibold">Verify your WhatsApp number</h2>
      <p className="mt-2 text-sm text-zinc-600">
        We send you WhatsApp updates about your bookings, so let&apos;s make sure your number works.
      </p>

      {params.error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {decodeURIComponent(params.error)}
        </p>
      ) : null}

      <form action={submitWhatsAppNumber} className="mt-5 space-y-2">
        <label className="block text-sm font-medium">Your WhatsApp number</label>
        <p className="text-xs text-zinc-500">Include country code, e.g. +91 98765 43210.</p>
        <input
          name="phone"
          required
          defaultValue={host.phone ?? ""}
          placeholder="+91..."
          className="field"
        />
        <button className="btn-primary mt-2 w-full">
          {messageSent ? "Resend welcome message" : "Send welcome message"}
        </button>
      </form>

      {messageSent ? (
        <div className="mt-6 border-t border-zinc-100 pt-5">
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            We sent a welcome message to <strong>{host.phone}</strong> on WhatsApp.
          </p>
          <div className="mt-4">
            <TestMessagePreview
              initialMessages={welcomePreview}
              autoOpen
              buttonLabel="Show welcome message"
            />
          </div>
          <p className="mt-4 text-sm font-medium">Did you receive it?</p>
          <form action={confirmWhatsAppReceived} className="mt-2">
            <button className="btn-primary w-full">Yes, I received it</button>
          </form>
          <p className="mt-2 text-xs text-zinc-500">
            Didn&apos;t get it? Check the number above and resend.
          </p>
        </div>
      ) : null}
    </div>
  );
}
