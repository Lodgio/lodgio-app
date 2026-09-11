import {
  canStartGmailOAuth,
  isGmailAllowlistRequired,
  type GmailAccessStatus,
} from "@/lib/gmail-access";
import { requestGmailAccess } from "@/app/(dashboard)/dashboard/actions";
import { SubmitButton } from "@/components/submit-button";
import { StatusBadge } from "@/components/dashboard-shell";

export function GmailAccessPanel({
  gmailStatus,
  gmailEmail,
  accessStatus,
  requestedEmail,
  variant,
}: {
  gmailStatus: "active" | "needs_reconnect" | "revoked" | null;
  gmailEmail: string | null;
  accessStatus: GmailAccessStatus | null;
  requestedEmail: string | null;
  variant: "onboarding" | "settings" | "overview";
}) {
  const active = gmailStatus === "active";
  const allowlist = isGmailAllowlistRequired();
  const canConnect = canStartGmailOAuth(accessStatus, active);
  const status = accessStatus ?? "none";

  if (active) {
    return (
      <div className="space-y-3 text-sm">
        <p>
          Connected as <strong>{gmailEmail}</strong>
        </p>
        <StatusBadge status="active" />
        {variant !== "overview" ? (
          <a href="/api/auth/gmail" className="block text-sm text-zinc-500 underline">
            Use another account
          </a>
        ) : null}
      </div>
    );
  }

  if (gmailStatus === "needs_reconnect") {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-red-700">Gmail needs reconnect.</p>
        <a href="/api/auth/gmail" className="btn-primary inline-block">
          Reconnect Gmail
        </a>
      </div>
    );
  }

  if (!allowlist) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-zinc-600">Connect Gmail to ingest Airbnb booking emails.</p>
        <a href="/api/auth/gmail" className="btn-primary inline-block">
          Connect Gmail
        </a>
      </div>
    );
  }

  if (status === "pending_review") {
    return (
      <div className="space-y-3 text-sm">
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
          Admin is adding <strong>{requestedEmail}</strong> to Google access. Connect unlocks when
          it is ready — come back here after you get the go-ahead.
        </p>
        {variant !== "overview" ? (
          <GmailRequestForm
            defaultEmail={requestedEmail ?? ""}
            submitLabel="Update inbox"
            pendingLabel="Updating…"
          />
        ) : null}
      </div>
    );
  }

  if (canConnect) {
    return (
      <div className="space-y-3 text-sm">
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
          Inbox approved{requestedEmail ? ` for ${requestedEmail}` : ""}. Connect it to continue
          to the next step.
        </p>
        <a href="/api/auth/gmail" className="btn-primary inline-block">
          {variant === "onboarding" ? "Connect and continue" : "Connect Gmail"}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-zinc-600">
        {variant === "overview"
          ? "Finish onboarding to submit the inbox. Every host is verified before Gmail can connect."
          : "Enter the inbox that receives Airbnb confirmation emails. An admin will allow it, then you can connect."}
      </p>
      {variant === "overview" ? (
        <a href="/dashboard/onboarding?step=1" className="btn-primary inline-block">
          Continue setup
        </a>
      ) : (
        <GmailRequestForm defaultEmail={requestedEmail ?? ""} />
      )}
    </div>
  );
}

function GmailRequestForm({
  defaultEmail,
  submitLabel = "Submit inbox for review",
  pendingLabel = "Submitting…",
}: {
  defaultEmail: string;
  submitLabel?: string;
  pendingLabel?: string;
}) {
  return (
    <form action={requestGmailAccess} className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Inbox that receives Airbnb confirmations</span>
        <input
          name="gmail_email"
          type="email"
          required
          defaultValue={defaultEmail}
          placeholder="host@gmail.com"
          className="field"
          autoComplete="email"
        />
      </label>
      <SubmitButton className="btn-primary" pendingLabel={pendingLabel}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
