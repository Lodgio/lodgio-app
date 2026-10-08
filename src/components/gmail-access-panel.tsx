import type { GmailAccessStatus } from "@/lib/gmail-access";
import { GmailUnverifiedHint } from "@/components/gmail-unverified-hint";
import { StatusBadge } from "@/components/dashboard-shell";

export function GmailAccessPanel({
  gmailStatus,
  gmailEmail,
  variant,
}: {
  gmailStatus: "active" | "needs_reconnect" | "revoked" | null;
  gmailEmail: string | null;
  accessStatus?: GmailAccessStatus | null;
  requestedEmail?: string | null;
  variant: "onboarding" | "settings" | "overview";
}) {
  const active = gmailStatus === "active";

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
        <GmailUnverifiedHint />
        <a href="/api/auth/gmail" className="btn-primary inline-block">
          Reconnect Gmail
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-zinc-600">Connect Gmail to ingest Airbnb booking emails.</p>
      <GmailUnverifiedHint />
      <a href="/api/auth/gmail" className="btn-primary inline-block">
        Connect Gmail
      </a>
    </div>
  );
}
