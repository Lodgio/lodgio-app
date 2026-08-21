import { env } from "@/lib/env";

export type GmailAccessStatus = "none" | "pending_review" | "approved" | "connected";

export function isGmailAllowlistRequired(): boolean {
  return env.gmailAllowlistRequired;
}

export function canStartGmailOAuth(
  status: GmailAccessStatus | null | undefined,
  hasActiveConnection: boolean
): boolean {
  if (!isGmailAllowlistRequired()) return true;
  if (hasActiveConnection) return true;
  return status === "approved" || status === "connected";
}

export function normalizeGmailAddress(value: string): string {
  return value.trim().toLowerCase();
}
