/** India WhatsApp / mobile numbers stored as +91XXXXXXXXXX, plus a QA allowlist. */

const TEST_WHATSAPP_E164 = ["+48453380133"] as const;
const TEST_WHATSAPP_ALIAS = "-453380133";

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function matchTestWhatsApp(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === TEST_WHATSAPP_ALIAS) return TEST_WHATSAPP_E164[0];

  const digits = digitsOnly(value);
  for (const allowed of TEST_WHATSAPP_E164) {
    const allowedDigits = digitsOnly(allowed);
    if (
      digits === allowedDigits ||
      digits === `91${allowedDigits}` ||
      digits === allowedDigits.slice(2)
    ) {
      return allowed;
    }
  }
  return null;
}

export function normalizeInPhone(value: string): string | null {
  const testNumber = matchTestWhatsApp(value);
  if (testNumber) return testNumber;

  let digits = digitsOnly(value);
  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  }
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91${digits}`;
  }
  return null;
}

/** Digits Meta Cloud API expects in `to` (E.164 without +). */
export function whatsappDestination(value: string): string {
  const normalized = normalizeInPhone(value);
  if (normalized) return digitsOnly(normalized);
  return digitsOnly(value);
}

export function indianMobileLocal(value: string | null | undefined): string {
  if (!value) return "";
  const testNumber = matchTestWhatsApp(value);
  if (testNumber) return TEST_WHATSAPP_ALIAS;
  const normalized = normalizeInPhone(value);
  if (normalized) return normalized.slice(3);
  const digits = digitsOnly(value);
  return digits.length > 10 ? digits.slice(-10) : digits;
}
