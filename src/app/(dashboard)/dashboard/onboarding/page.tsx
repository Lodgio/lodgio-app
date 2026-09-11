import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHost } from "@/lib/host";
import {
  advanceOnboarding,
  createProperty,
  createCaretaker,
  updateProperty,
  updateCaretaker,
} from "@/app/(dashboard)/dashboard/actions";
import { PropertyFields } from "@/components/property-fields";
import { IndianPhoneField } from "@/components/indian-phone-field";
import { GmailAccessPanel } from "@/components/gmail-access-panel";
import { isPhase12Demo } from "@/lib/demo";
import {
  getNextOnboardingStepAfterCaretaker,
  getOnboardingSteps,
  isWhatsAppEnabled,
} from "@/lib/features";
import { SubmitButton } from "@/components/submit-button";

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
            {params.gmail === "requested" ? (
              <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Inbox submitted. An admin will allow it, then you can connect.
              </p>
            ) : null}
            {params.gmail === "denied" ? (
              <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Google blocked this inbox because it is not on the test-user list yet. Wait for
                admin approval, then try Connect again.
              </p>
            ) : null}
            {errorBanner}
            {phase12 ? (
              <p className="mb-3 text-sm text-zinc-600">
                Link the inbox that receives Airbnb confirmation emails. Lodgio will parse booking
                details and show them under Bookings.
              </p>
            ) : (
              <p className="mb-3 text-sm text-zinc-600">
                Connect the inbox that receives Airbnb confirmation emails so bookings appear
                automatically.
              </p>
            )}
            <GmailAccessPanel
              gmailStatus={gmail?.status ?? null}
              gmailEmail={gmail?.email_address ?? null}
              accessStatus={settings?.gmail_access_status ?? "none"}
              requestedEmail={settings?.gmail_requested_email ?? null}
              variant="onboarding"
            />
            {gmail?.status === "active" ? (
              <div className="mt-4">
                {phase12 ? (
                  <Link href="/dashboard/bookings" className="btn-primary inline-block">
                    Go to Bookings
                  </Link>
                ) : (
                  <form action={advanceOnboarding}>
                    <input type="hidden" name="step" value="2" />
                    <SubmitButton className="btn-primary" pendingLabel="Continuing…">
                      Continue
                    </SubmitButton>
                  </form>
                )}
              </div>
            ) : null}
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
                      <details className="mt-2">
                        <summary className="cursor-pointer text-blue-600">Edit</summary>
                        <form action={updateProperty} className="mt-2 space-y-3">
                          <input type="hidden" name="property_id" value={p.id} />
                          <PropertyFields defaults={p} />
                          <SubmitButton className="btn-secondary" pendingLabel="Saving…">
                            Save changes
                          </SubmitButton>
                        </form>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <form action={createProperty} className="space-y-4 border-t border-zinc-100 pt-4">
              <input type="hidden" name="onboarding_next_step" value="2" />
              <PropertyFields />
              <SubmitButton className="btn-primary" pendingLabel="Saving…">
                Save property
              </SubmitButton>
            </form>

            {(properties ?? []).length > 0 ? (
              <form action={advanceOnboarding} className="mt-4">
                <input type="hidden" name="step" value="3" />
                <SubmitButton className="btn-secondary" pendingLabel="Continuing…">
                  Continue to caretaker →
                </SubmitButton>
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
                      <details className="mt-2">
                        <summary className="cursor-pointer text-blue-600">Edit</summary>
                        <form action={updateCaretaker} className="mt-2 space-y-3">
                          <input type="hidden" name="caretaker_id" value={c.id} />
                          <input type="hidden" name="error_path" value="/dashboard/onboarding?step=3" />
                          <input name="name" required defaultValue={c.name} className="field" />
                          <IndianPhoneField
                            name="phone"
                            label="WhatsApp number"
                            required
                            defaultValue={c.phone}
                          />
                          <SubmitButton className="btn-secondary" pendingLabel="Saving…">
                            Save changes
                          </SubmitButton>
                        </form>
                      </details>
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
              <IndianPhoneField name="phone" label="WhatsApp number" required />
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
              <SubmitButton
                className="btn-primary"
                pendingLabel="Saving…"
                disabled={(properties ?? []).length === 0}
              >
                Save caretaker
              </SubmitButton>
            </form>

            {(caretakers ?? []).length > 0 ? (
              <form action={advanceOnboarding} className="mt-4">
                <input type="hidden" name="step" value={getNextOnboardingStepAfterCaretaker()} />
                <SubmitButton className="btn-secondary" pendingLabel="Finishing…">
                  Finish →
                </SubmitButton>
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
  );
}
