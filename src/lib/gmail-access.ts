export type GmailAccessStatus = "none" | "pending_review" | "approved" | "connected";

/**
 * The Google OAuth app is published. Test-user approval no longer gates Connect.
 * Kept so older call sites stay, but the manual allowlist is off.
 */
export function isGmailAllowlistRequired(): boolean {
  return false;
}

export function canStartGmailOAuth(
  _status: GmailAccessStatus | null | undefined,
  _hasActiveConnection: boolean
): boolean {
  return true;
}

export function normalizeGmailAddress(value: string): string {
  return value.trim().toLowerCase();
}
