import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell, Card, StatusBadge } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHost } from "@/lib/host";
import { advanceOnboarding, syncGmailNow } from "@/app/(dashboard)/dashboard/actions";
import { createProperty, createCaretaker } from "@/app/(dashboard)/dashboard/actions";
import { isPhase12Demo } from "@/lib/demo";
import {
  getNextOnboardingStepAfterCaretaker,
  getOnboardingSteps,
  isWhatsAppEnabled,
} from "@/lib/features";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; gmail?: string; saved?: string; error?: string }>;
}) {
  const host = await getCurrentHost();
  const supabase = await createClient();
  const params = await searchParams;

  const { data: settings } = await supabase
    .from("host_settings")
    .select("*")
    .eq("host_id", host!.id)
    .single();

  const step = Number(params.step ?? settings?.onboarding_step ?? 1);
  const phase12 = isPhase12Demo();
  const whatsappEnabled = isWhatsAppEnabled();
  const effectiveStep = phase12 ? 1 : step;

  if (phase12 && step !== 1) {
    redirect("/dashboard/onboarding?step=1");
  }

  const [{ data: gmail }, { data: properties }, { data: caretakers }] = await Promise.all([
    supabase.from("gmail_connections").select("*").maybeSingle(),
    supabase.from("properties").select("*").order("name"),
    supabase.from("caretakers").select("*").order("name"),
  ]);

  const savedBanner =
    params.saved === "property" ? (
      <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        Property saved. Add another listing below or continue to the next step.
      </p>
    ) : params.saved === "caretaker" ? (
      <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        Caretaker saved. Add another below or continue to the check-in link step.
      </p>
    ) : null;

  const errorBanner = params.error ? (
    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {decodeURIComponent(params.error)}
    </p>
  ) : null;

  return (
    <DashboardShell title={phase12 ? "Connect Gmail" : "Onboarding"}>
      <div className="space-y-4">
        {!phase12 ? (
        <div className="flex flex-wrap gap-2 text-sm">
          {getOnboardingSteps().map((n) => (
            <Link
              key={n}
              href={`/dashboard/onboarding?step=${n}`}
              className={`rounded-full px-3 py-1 ${effectiveStep === n ? "bg-zinc-900 text-white" : "border border-zinc-300"}`}
            >
              Step {n}
            </Link>
          ))}
        </div>
        ) : null}

        {effectiveStep === 1 && (
          <Card title={phase12 ? "Connect Gmail" : "1. Connect Gmail"}>
            {phase12 ? (
              <p className="mb-3 text-sm text-zinc-600">
                Link the inbox that receives Airbnb confirmation emails. Lodgio will parse booking
                details and show them under Bookings.
              </p>
            ) : null}
            {gmail?.status === "active" ? (
              <div className="space-y-2 text-sm">
                <p>Connected as {gmail.email_address}</p>
                <StatusBadge status={gmail.status} />
              </div>
            ) : gmail?.status === "needs_reconnect" ? (
              <p className="text-sm text-red-700">Gmail needs reconnect.</p>
            ) : (
              <p className="text-sm text-zinc-600">Connect Gmail to ingest Airbnb booking emails.</p>
            )}
            <div className="mt-4 flex flex-col items-start gap-3">
              {gmail?.status === "active" ? (
                <>
                  {phase12 ? (
                    <>
                      <form action={syncGmailNow}>
                        <button type="submit" className="btn-primary">
                          Sync Gmail &amp; view bookings
                        </button>
                      </form>
                      <Link href="/dashboard/bookings" className="btn-secondary inline-block">
                        Go to Bookings
                      </Link>
                    </>
                  ) : (
                    <form action={advanceOnboarding}>
                      <input type="hidden" name="step" value="2" />
                      <button className="btn-primary">Continue</button>
                    </form>
                  )}
                  <a href="/api/auth/gmail" className="text-sm text-zinc-500 underline">
                    Use another account
                  </a>
                </>
              ) : (
                <a href="/api/auth/gmail" className="btn-primary">
                  {gmail?.status === "needs_reconnect" ? "Reconnect Gmail" : "Connect Gmail"}
                </a>
              )}
            </div>
          </Card>
        )}

        {!phase12 && step === 2 && (
          <Card title="2. Add property">
            <p className="mb-4 text-sm text-zinc-600">
              Add each Airbnb listing you host. The <strong>listing name</strong> must match how it
              appears in Airbnb confirmation emails so bookings link to the right property.
            </p>
            {savedBanner}
            {errorBanner}

            {(properties ?? []).length > 0 ? (
              <div className="mb-5 space-y-2">
                <p className="text-sm font-medium text-zinc-800">Saved properties</p>
                <ul className="space-y-2">
                  {(properties ?? []).map((p) => (
                    <li
                      key={p.id}
                      className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{p.name}</span>
                      {p.address ? (
                        <span className="text-zinc-500"> — {p.address}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <form action={createProperty} className="space-y-4 border-t border-zinc-100 pt-4">
              <input type="hidden" name="onboarding_next_step" value="2" />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Listing name</label>
                <p className="text-xs text-zinc-500">Exactly as in Airbnb emails, e.g. Rehaish Maple.</p>
                <input name="name" required placeholder="Rehaish Maple" className="field" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Address</label>
                <p className="text-xs text-zinc-500">Shown to guests with check-in details.</p>
                <input name="address" placeholder="Street, city" className="field" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Google Maps link</label>
                <p className="text-xs text-zinc-500">Precise pin for check-in — better than Airbnb&apos;s map.</p>
                <input name="location_url" placeholder="https://maps.google.com/..." className="field" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Check-in time</label>
                <p className="text-xs text-zinc-500">When guests can arrive, e.g. 2:00 PM.</p>
                <input
                  name="check_in_time"
                  placeholder="2:00 PM"
                  defaultValue="2:00 PM"
                  className="field"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">House rules (optional)</label>
                <textarea name="house_rules" placeholder="Check-in time, quiet hours..." className="field" rows={3} />
              </div>
              <button className="btn-primary">Save property</button>
            </form>

            {(properties ?? []).length > 0 ? (
              <form action={advanceOnboarding} className="mt-4">
                <input type="hidden" name="step" value="3" />
                <button className="btn-secondary">Continue to caretaker →</button>
              </form>
            ) : null}
          </Card>
        )}

        {!phase12 && step === 3 && (
          <Card title="3. Add caretaker">
            <p className="mb-4 text-sm text-zinc-600">
              Add the on-site caretaker for each property so the right person is notified when a
              guest books.
            </p>
            {savedBanner}
            {errorBanner}

            {(caretakers ?? []).length > 0 ? (
              <div className="mb-5 space-y-2">
                <p className="text-sm font-medium text-zinc-800">Saved caretakers</p>
                <ul className="space-y-2">
                  {(caretakers ?? []).map((c) => (
                    <li
                      key={c.id}
                      className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-zinc-500"> — {c.phone}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <form action={createCaretaker} className="space-y-4 border-t border-zinc-100 pt-4">
              <input type="hidden" name="onboarding_next_step" value="3" />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Caretaker name</label>
                <input name="name" required placeholder="e.g. Rajesh" className="field" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Phone number</label>
                <p className="text-xs text-zinc-500">Include country code, e.g. +91 98765 43210.</p>
                <input name="phone" required placeholder="+91..." className="field" />
              </div>
              {(properties ?? []).length > 0 ? (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Property</label>
                  <p className="text-xs text-zinc-500">Which listing this caretaker looks after.</p>
                  <select name="property_id" required className="field" defaultValue="">
                    <option value="" disabled>
                      Select property
                    </option>
                    {(properties ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-sm text-amber-800">
                  Add a property in Step 2 first, then come back to link a caretaker.
                </p>
              )}
              <button className="btn-primary" disabled={(properties ?? []).length === 0}>
                Save caretaker
              </button>
            </form>

            {(caretakers ?? []).length > 0 ? (
              <form action={advanceOnboarding} className="mt-4">
                <input type="hidden" name="step" value={getNextOnboardingStepAfterCaretaker()} />
                <button className="btn-secondary">Finish →</button>
              </form>
            ) : null}
          </Card>
        )}

        {!phase12 && step === 4 && (
          <Card title="4. All set">
            <p className="text-sm text-zinc-600">
              Lodgio will ingest bookings from Gmail and match guest check-in forms
              {whatsappEnabled ? ", send guest messages," : ""} and export to Sheets.
            </p>
            <Link href="/dashboard" className="btn-primary mt-4 inline-block">
              Go to dashboard
            </Link>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
