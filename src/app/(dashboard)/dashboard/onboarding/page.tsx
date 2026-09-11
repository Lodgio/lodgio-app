import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHost } from "@/lib/host";
import { advanceOnboarding, createProperty, createCaretaker } from "@/app/(dashboard)/dashboard/actions";
import { PropertyFields } from "@/components/property-fields";
import { IndianPhoneField } from "@/components/indian-phone-field";
import { GmailAccessPanel } from "@/components/gmail-access-panel";
import { OnboardingWizard } from "@/components/onboarding-wizard";
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
        Property saved. Continue to caretaker, or add another listing.
      </p>
    ) : params.saved === "caretaker" ? (
      <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        Caretaker saved. Continue, or add another caretaker.
      </p>
    ) : null;

  const hasProperties = (properties ?? []).length > 0;
  const hasCaretakers = (caretakers ?? []).length > 0;

  const errorBanner = params.error ? (
    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {decodeURIComponent(params.error)}
    </p>
  ) : null;

  const gmailCard = (
    <Card title={phase12 ? "Connect Gmail" : "1. Connect Gmail"}>
      {params.gmail === "requested" ? (
        <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Inbox submitted. An admin will allow it, then you can connect.
        </p>
      ) : null}
      {params.gmail === "denied" ? (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Google blocked this inbox because it is not on the test-user list yet. Wait for admin
          approval, then try Connect again.
        </p>
      ) : null}
      {effectiveStep === 1 ? errorBanner : null}
      {phase12 ? (
        <p className="mb-3 text-sm text-zinc-600">
          Link the inbox that receives Airbnb confirmation emails. Lodgio will parse booking details
          and show them under Bookings.
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
  );

  const propertyCreateForm = (
    <form action={createProperty} className="space-y-4">
      <input type="hidden" name="onboarding_next_step" value="2" />
      <PropertyFields />
      <SubmitButton className="btn-primary" pendingLabel="Saving…">
        Save property
      </SubmitButton>
    </form>
  );

  const propertyCard = (
    <Card title="2. Add property">
      <p className="mb-4 text-sm text-zinc-600">
        Add each Airbnb listing you host. The <strong>listing name</strong> must match how it
        appears in Airbnb confirmation emails so bookings link to the right property.
      </p>
      {params.saved === "property" ? savedBanner : null}
      {effectiveStep === 2 ? errorBanner : null}

      {hasProperties ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-800">Your properties</p>
            <ul className="space-y-2">
              {(properties ?? []).map((p) => (
                <li
                  key={p.id}
                  className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{p.name}</span>
                  {p.address ? <span className="text-zinc-500"> — {p.address}</span> : null}
                </li>
              ))}
            </ul>
          </div>
          <form action={advanceOnboarding}>
            <input type="hidden" name="step" value="3" />
            <SubmitButton className="btn-primary" pendingLabel="Continuing…">
              Continue to caretaker →
            </SubmitButton>
          </form>
          <details>
            <summary className="cursor-pointer text-sm font-medium text-blue-600">
              Add another property
            </summary>
            <div className="mt-4">{propertyCreateForm}</div>
          </details>
        </div>
      ) : (
        propertyCreateForm
      )}
    </Card>
  );

  const caretakerCreateForm = (
    <form action={createCaretaker} className="space-y-4">
      <input type="hidden" name="onboarding_next_step" value="3" />
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Caretaker name</label>
        <input name="name" required placeholder="e.g. Rajesh" className="field" />
      </div>
      <IndianPhoneField name="phone" label="WhatsApp number" required />
      {hasProperties ? (
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
      <SubmitButton className="btn-primary" pendingLabel="Saving…" disabled={!hasProperties}>
        Save caretaker
      </SubmitButton>
    </form>
  );

  const caretakerCard = (
    <Card title="3. Add caretaker">
      <p className="mb-4 text-sm text-zinc-600">
        Add the on-site caretaker for each property so the right person is notified when a guest
        books.
      </p>
      {params.saved === "caretaker" ? savedBanner : null}
      {effectiveStep === 3 ? errorBanner : null}

      {hasCaretakers ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-800">Your caretakers</p>
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
          <form action={advanceOnboarding}>
            <input type="hidden" name="step" value={getNextOnboardingStepAfterCaretaker()} />
            <SubmitButton className="btn-primary" pendingLabel="Finishing…">
              Finish →
            </SubmitButton>
          </form>
          <details>
            <summary className="cursor-pointer text-sm font-medium text-blue-600">
              Add another caretaker
            </summary>
            <div className="mt-4">{caretakerCreateForm}</div>
          </details>
        </div>
      ) : (
        caretakerCreateForm
      )}
    </Card>
  );

  const gmailReady = gmail?.status === "active";
  const setupGaps = [
    !gmailReady
      ? {
          step: 1,
          title: "Connect Gmail",
          detail: "Enter the inbox that receives Airbnb confirmation emails, then connect it.",
        }
      : null,
    !hasProperties
      ? { step: 2, title: "Add a property", detail: "Add at least one Airbnb listing." }
      : null,
    !hasCaretakers
      ? { step: 3, title: "Add a caretaker", detail: "Add the on-site contact for your listing." }
      : null,
  ].filter((item): item is { step: number; title: string; detail: string } => item !== null);

  const doneCard =
    setupGaps.length === 0 ? (
      <Card title="4. All set">
        <p className="text-sm text-zinc-600">
          Lodgio will ingest bookings from Gmail and match guest check-in forms
          {whatsappEnabled ? ", send guest messages," : ""} and export to Sheets.
        </p>
        <Link href="/dashboard" className="btn-primary mt-4 inline-block">
          Go to dashboard
        </Link>
      </Card>
    ) : (
      <Card title="4. Finish setup">
        <p className="mb-4 text-sm text-zinc-600">
          This step is not done yet — a few things are still missing.
        </p>
        <ul className="space-y-2">
          {setupGaps.map((item) => (
            <li
              key={item.step}
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
            >
              <p className="font-medium text-amber-950">{item.title}</p>
              <p className="text-amber-900">{item.detail}</p>
              <Link
                href={`/dashboard/onboarding?step=${item.step}`}
                className="mt-2 inline-block text-sm font-medium text-blue-600"
              >
                Go to step {item.step}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    );

  if (phase12) {
    return <div className="space-y-4">{gmailCard}</div>;
  }

  return (
    <OnboardingWizard
      steps={getOnboardingSteps()}
      initialStep={effectiveStep}
      panels={{
        1: gmailCard,
        2: propertyCard,
        3: caretakerCard,
        4: doneCard,
      }}
    />
  );
}
