/** India-only WhatsApp / mobile numbers stored as +91XXXXXXXXXX. */

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeInPhone(value: string): string | null {
  let digits = digitsOnly(value);
  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  }
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91${digits}`;
  }
  return null;
}

export function indianMobileLocal(value: string | null | undefined): string {
  if (!value) return "";
  const normalized = normalizeInPhone(value);
  if (normalized) return normalized.slice(3);
  const digits = digitsOnly(value);
  return digits.length > 10 ? digits.slice(-10) : digits;
}
