export type AirbnbEmailType = "confirmation" | "reminder" | "payout" | "other";

export interface PreparedAirbnbEmail {
  text: string;
  subject: string;
  referenceDate: Date | null;
  emailType: AirbnbEmailType;
}

export function decodeQuotedPrintable(input: string): string {
  const withoutSoftBreaks = input.replace(/=\r?\n/g, "");
  const bytes: number[] = [];

  for (let i = 0; i < withoutSoftBreaks.length; i += 1) {
    if (withoutSoftBreaks[i] === "=" && i + 2 < withoutSoftBreaks.length) {
      const hex = withoutSoftBreaks.slice(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }
    bytes.push(withoutSoftBreaks.charCodeAt(i));
  }

  return Buffer.from(bytes).toString("utf8");
}

function stripHtml(input: string): string {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi, " $1 ")
    .replace(/<img\b[^>]*alt=["']([^"']+)["'][^>]*>/gi, " [image: $1] ")
    .replace(/<(?:br|hr)\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|tr|h[1-6]|li|table|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

function extractSubject(text: string): string {
  const subjects = [...text.matchAll(/^Subject:\s*(.+)$/gim)].map((match) => match[1].trim());
  const confirmation = subjects.find((value) =>
    value.toLowerCase().includes("reservation confirmed")
  );
  return confirmation ?? subjects[subjects.length - 1] ?? "";
}

function extractReferenceDate(text: string): Date | null {
  const dates = [...text.matchAll(/^Date:\s*(.+)$/gim)].map((match) => match[1].trim());
  for (let i = dates.length - 1; i >= 0; i -= 1) {
    const parsed = new Date(dates[i]);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function extractInnerAirbnbBlock(text: string): string {
  const marker = /From:\s*(?:Airbnb\s*<)?automated@airbnb\.com>?/gi;
  let lastIndex = -1;
  let match: RegExpExecArray | null;

  while ((match = marker.exec(text)) !== null) {
    lastIndex = match.index;
  }

  if (lastIndex < 0) {
    return text;
  }

  let block = text.slice(lastIndex);
  const htmlStart = block.search(/\r?\nContent-Type: text\/html/i);
  if (htmlStart > 0) {
    block = block.slice(0, htmlStart);
  }

  const boundary = block.search(/\r?\n--[0-9a-zA-Z]/);
  if (boundary > 0) {
    block = block.slice(0, boundary);
  }

  return block;
}

export function classifyAirbnbEmail(subject: string): AirbnbEmailType {
  const normalized = decodeMimeWords(subject).toLowerCase();

  if (normalized.includes("reservation confirmed")) return "confirmation";
  if (normalized.includes("reservation reminder")) return "reminder";
  if (normalized.includes("we sent a payout") || normalized.includes("payout of")) {
    return "payout";
  }

  return "other";
}

function decodeMimeWords(input: string): string {
  return input.replace(
    /=\?UTF-8\?Q\?([^?]+)\?=/gi,
    (_, encoded: string) => decodeQuotedPrintable(encoded.replace(/_/g, " "))
  );
}

export function prepareAirbnbEmail(
  raw: string,
  receivedAt?: string,
  headerSubject?: string
): PreparedAirbnbEmail {
  const decoded = decodeQuotedPrintable(raw);
  const inner = extractInnerAirbnbBlock(decoded);
  const plain =
    inner.includes("<html") || inner.includes("<table")
      ? stripHtml(inner)
      : inner;
  const text = normalizeWhitespace(plain);
  const subject =
    headerSubject?.trim() ||
    extractSubject(text) ||
    extractSubject(decoded) ||
    extractSubject(raw);
  const referenceDate =
    extractReferenceDate(text) ??
    extractReferenceDate(decoded) ??
    (receivedAt ? new Date(receivedAt) : null);

  return {
    text,
    subject,
    referenceDate: referenceDate && !Number.isNaN(referenceDate.getTime()) ? referenceDate : null,
    emailType: classifyAirbnbEmail(subject),
  };
}

export type GmailApiPart = {
  mimeType?: string | null;
  filename?: string | null;
  body?: { data?: string | null } | null;
  parts?: GmailApiPart[] | null;
  headers?: Array<{ name?: string | null; value?: string | null }> | null;
};

export function decodeGmailBodyData(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf8");
}

export function gmailHeader(headers: GmailApiPart["headers"], name: string): string {
  const match = headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase());
  return match?.value?.trim() ?? "";
}

function collectPartBodies(
  part: GmailApiPart | null | undefined,
  acc: { plain: string[]; html: string[] }
): void {
  if (!part) return;

  const mime = part.mimeType ?? "";
  const data = part.body?.data;
  if (data && !part.filename) {
    const decoded = decodeGmailBodyData(data);
    if (mime === "text/plain") acc.plain.push(decoded);
    else if (mime === "text/html") acc.html.push(decoded);
  }

  for (const child of part.parts ?? []) {
    collectPartBodies(child, acc);
  }
}

/** Walk nested multipart payloads from Gmail `messages.get` format=full. */
export function extractGmailApiBody(message: { payload?: GmailApiPart | null }): string {
  const acc = { plain: [] as string[], html: [] as string[] };
  collectPartBodies(message.payload, acc);
  return acc.plain[0] || acc.html[0] || "";
}
