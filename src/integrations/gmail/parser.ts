import { z } from "zod";
import type { ParsedBookingEmail } from "@/integrations/types";
import { prepareAirbnbEmail } from "@/integrations/gmail/email-utils";

export const parsedBookingSchema = z.object({
  airbnbBookingId: z.string().min(1),
  guestName: z.string().min(1),
  relayEmail: z.string().email().nullable(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkInTime: z.string().nullable(),
  checkOutTime: z.string().nullable(),
  nights: z.number().int().positive(),
  guestCount: z.number().int().positive(),
  amountPaidByGuest: z.number().nullable(),
  amountPayableToHost: z.number().nullable(),
  amountPayableToAirbnb: z.number().nullable(),
  guestNotes: z.string().nullable(),
  listingName: z.string().min(1),
});

const MONTH_MAP: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

function parseAmount(text: string): number | null {
  if (!text) return null;
  const match = text.match(/(-?\d[\d,]*(?:\.\d{2})?)/);
  if (!match) return null;
  return Math.abs(parseFloat(match[1].replace(/,/g, "")));
}

function parseLabeledAmount(body: string, labelPattern: string): number | null {
  const regex = new RegExp(
    `(?:${labelPattern})[\\s\\S]*?(?:₹|INR|Rs\\.?\\s*)?(-?\\d[\\d,]*\\.\\d{2})`,
    "i"
  );
  const match = body.match(regex);
  if (!match) return null;
  const amount = match[match.length - 1];
  return amount ? parseAmount(amount) : null;
}

function parseTime(text: string): string | null {
  const normalized = text.replace(/\u202f/g, " ").trim();
  const match = normalized.match(/\b(\d{1,2}:\d{2})\s*(AM|PM)\b/i);
  if (!match) return null;
  return `${match[1]} ${match[2].toUpperCase()}`;
}

function parseCheckInOutSection(
  body: string,
  kind: "in" | "out"
): { dateText: string | null; timeText: string | null } {
  const blockLine = (label: string) =>
    new RegExp(
      `(?:^|\\n)\\s*${label}\\s*(?:\\n\\s*)*([^\\n]+)(?:\\s*(?:\\n\\s*)*([^\\n]+))?`,
      "m"
    );

  if (kind === "in") {
    const blockMatch = body.match(blockLine("Check-in"));
    if (blockMatch) {
      const line1 = blockMatch[1].trim();
      const line2 = blockMatch[2]?.trim() ?? null;
      const timeFromLine1 = parseTime(line1);
      if (timeFromLine1) {
        return { dateText: null, timeText: timeFromLine1 };
      }
      return { dateText: line1, timeText: line2 ? parseTime(line2) : null };
    }

    const inline = body.match(/Check[- ]in[:\s]+(.+)/i);
    return { dateText: inline?.[1]?.trim() ?? null, timeText: null };
  }

  const blockMatch =
    body.match(blockLine("Checkout")) ?? body.match(/Check[- ]out[:\s]+(.+)/i);
  if (!blockMatch) {
    return { dateText: null, timeText: null };
  }

  if (blockMatch[2] !== undefined) {
    const line1 = blockMatch[1].trim();
    const line2 = blockMatch[2]?.trim() ?? null;
    const timeFromLine1 = parseTime(line1);
    if (timeFromLine1) {
      return { dateText: null, timeText: timeFromLine1 };
    }
    return { dateText: line1, timeText: line2 ? parseTime(line2) : null };
  }

  const inlineText = blockMatch[1].trim();
  const timeFromInline = parseTime(inlineText);
  if (timeFromInline) {
    return { dateText: null, timeText: timeFromInline };
  }
  return { dateText: inlineText, timeText: null };
}

function parseDate(text: string, referenceDate?: Date | null): string | null {
  const cleaned = text
    .replace(/\u202f/g, " ")
    .replace(/\d{1,2}:\d{2}\s*(?:AM|PM)?/gi, "")
    .trim();

  const iso = cleaned.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  const dmy = cleaned.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
  if (dmy) {
    const month = MONTH_MAP[dmy[2].slice(0, 3).toLowerCase()];
    return `${dmy[3]}-${month}-${dmy[1].padStart(2, "0")}`;
  }

  const weekdayShort = cleaned.match(
    /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+([A-Za-z]{3})\s+(\d{1,2})(?:,?\s+(\d{4}))?/i
  );
  if (weekdayShort) {
    const month = MONTH_MAP[weekdayShort[1].slice(0, 3).toLowerCase()];
    const day = weekdayShort[2].padStart(2, "0");
    if (weekdayShort[3]) {
      return `${weekdayShort[3]}-${month}-${day}`;
    }
    if (referenceDate) {
      let year = referenceDate.getFullYear();
      const refMonth = referenceDate.getMonth() + 1;
      const checkMonth = parseInt(month, 10);
      if (checkMonth < refMonth - 6) year += 1;
      if (checkMonth > refMonth + 6) year -= 1;
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

function parseGuestCount(text: string): number | null {
  const detailed = text.match(/(\d+)\s+adults?(?:,\s*(\d+)\s+children?)?/i);
  if (detailed) {
    const adults = parseInt(detailed[1], 10);
    const children = detailed[2] ? parseInt(detailed[2], 10) : 0;
    return adults + children;
  }

  const simple = text.match(/(?:Guests|Number of guests):\s+(\d+)/i);
  if (simple) return parseInt(simple[1], 10);

  return null;
}

function parseNights(body: string, checkIn: string | null, checkOut: string | null): number {
  const explicit = body.match(/(?:Nights)[:\s]+(\d+)/i) ?? body.match(/x\s+(\d+)\s+nights/i);
  if (explicit) return parseInt(explicit[1], 10);

  if (checkIn && checkOut) {
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const nights = Math.round(diff / (1000 * 60 * 60 * 24));
    if (nights > 0) return nights;
  }

  return 0;
}

function parseGuestName(body: string, subject: string): string {
  const fromSubject = subject.match(
    /Reservation confirmed\s*[-–—]\s*([A-Za-z .'-]+?)\s+arrives/i
  );
  if (fromSubject) return fromSubject[1].trim();

  const labeled = body.match(/(?:Guest|Traveller|Traveler):\s+([A-Za-z .'-]+)/i);
  if (labeled) return labeled[1].trim();

  const standalone = body.match(
    /\n([A-Z][A-Za-z .'-]{1,60})\n(?:Identity verified|\[image)/i
  );
  return standalone?.[1]?.trim() ?? "";
}

function parseListingName(body: string): string {
  const labeled = body.match(/(?:Listing|Property)[:\s]+(.+?)(?:\n|$)/i);
  if (labeled) return labeled[1].trim();

  const imageAlts = [...body.matchAll(/\[image:\s*([^\]]+)\]/gi)].map((match) => match[1].trim());
  const listingAlt = imageAlts.find((alt) => !/^airbnb$/i.test(alt));
  if (listingAlt) return listingAlt;

  const beforeRoomType = body.match(
    /\n([^\n]+)\n+(?:Entire home\/apt|Private room|Shared room|Hotel room)/i
  );
  return beforeRoomType?.[1]?.trim() ?? "";
}

function parseBookingId(body: string): string {
  const labeled = body.match(
    /(?:Confirmation code|Booking ID|Reservation code)[:\s#]*\n?\s*([A-Z0-9]{8,12})/i
  );
  if (labeled) return labeled[1];

  const fromUrl = body.match(/\/hosting\/reservations\/details\/([A-Z0-9]{8,12})/i);
  return fromUrl?.[1] ?? "";
}

function parseGuestNotes(body: string): string | null {
  const labeled = body.match(/(?:Message from guest|Guest message)[:\s]+([\s\S]+?)(?:\r?\n\r?\n|$)/i);
  if (labeled) return labeled[1].trim();

  const inline = body.match(/\n(Hi[\s\S]+?)\r?\nSend [A-Za-z .'-]+ a Message/i);
  if (inline) return inline[1].trim();

  return null;
}

function parseLabeledAmounts(body: string, labels: string[]): number | null {
  for (const label of labels) {
    const amount = parseLabeledAmount(body, label);
    if (amount !== null) return amount;
  }
  return null;
}

export interface ParseAirbnbEmailOptions {
  referenceDate?: Date | null;
  subject?: string;
}

export function parseAirbnbEmail(
  body: string,
  rawEmailRef: string,
  options: ParseAirbnbEmailOptions = {}
): ParsedBookingEmail {
  const prepared = options.subject || options.referenceDate
    ? {
        text: body,
        subject: options.subject ?? "",
        referenceDate: options.referenceDate ?? null,
      }
    : prepareAirbnbEmail(body);

  const text = prepared.text;
  const subject = options.subject ?? prepared.subject;
  const referenceDate = options.referenceDate ?? prepared.referenceDate;

  const relayEmailMatch = text.match(/([a-z0-9._%+-]+@guest\.airbnb\.com)/i);
  const checkInSection = parseCheckInOutSection(text, "in");
  const checkOutSection = parseCheckInOutSection(text, "out");

  const checkIn = checkInSection.dateText
    ? parseDate(checkInSection.dateText, referenceDate)
    : null;
  const checkOut = checkOutSection.dateText
    ? parseDate(checkOutSection.dateText, referenceDate)
    : null;

  const partial = {
    airbnbBookingId: parseBookingId(text),
    guestName: parseGuestName(text, subject),
    relayEmail: relayEmailMatch?.[1] ?? null,
    checkIn: checkIn ?? "",
    checkOut: checkOut ?? "",
    checkInTime: checkInSection.timeText,
    checkOutTime: checkOutSection.timeText,
    nights: parseNights(text, checkIn, checkOut),
    guestCount: parseGuestCount(text) ?? 1,
    amountPaidByGuest: parseLabeledAmount(text, "Total paid|Total \\(INR\\)"),
    amountPayableToHost: parseLabeledAmounts(text, [
      "You earn",
      "You.?ll earn",
      "Host payout",
    ]),
    amountPayableToAirbnb: parseLabeledAmounts(text, [
      "Host service fee",
      "Airbnb service fee",
    ]),
    guestNotes: parseGuestNotes(text),
    listingName: parseListingName(text),
    rawEmailRef,
  };

  const result = parsedBookingSchema.safeParse(partial);
  if (result.success) {
    return { ...result.data, rawEmailRef };
  }

  return {
    ...partial,
    parseIncomplete: true,
  } as ParsedBookingEmail;
}
