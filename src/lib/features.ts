import { env } from "@/lib/env";

/** Live WhatsApp (Meta API). When false, UI hides WhatsApp-specific copy and settings. */
export function isWhatsAppEnabled(): boolean {
  return !env.useMockWhatsApp;
}

export function getOnboardingSteps(): number[] {
  return [1, 2, 3, 4];
}

export function getNextOnboardingStepAfterCaretaker(): number {
  return 4;
}
