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

export function prepareAirbnbEmail(raw: string, receivedAt?: string): PreparedAirbnbEmail {
  const decoded = decodeQuotedPrintable(raw);
  const inner = extractInnerAirbnbBlock(decoded);
  const plain =
    inner.includes("<html") || inner.includes("<table")
      ? stripHtml(inner)
      : inner;
  const text = normalizeWhitespace(plain);
  const subject = extractSubject(text) || extractSubject(decoded) || extractSubject(raw);
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
