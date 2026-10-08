/** Flip off once Google marks the OAuth app verified. */
export const SHOW_GMAIL_UNVERIFIED_HINT = true;

export function GmailUnverifiedHint() {
  if (!SHOW_GMAIL_UNVERIFIED_HINT) return null;
  return (
    <p className="text-sm text-zinc-600">
      Google may show a &ldquo;Google hasn&apos;t verified this app&rdquo; screen while our
      verification is in progress. Click Advanced, then Go to lodgio.in to continue.
    </p>
  );
}
