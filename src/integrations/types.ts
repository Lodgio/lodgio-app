export interface HostConnection {
  hostId: string;
  refreshToken?: string;
  emailAddress?: string;
  spreadsheetId?: string;
}

export interface Cursor {
  value: string | null;
}

export interface RawEmail {
  id: string;
  threadId: string;
  snippet: string;
  body: string;
  receivedAt: string;
}

export interface ParsedBookingEmail {
  airbnbBookingId: string;
  guestName: string;
  relayEmail: string | null;
  checkIn: string;
  checkOut: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  nights: number;
  guestCount: number;
  amountPaidByGuest: number | null;
  amountPayableToHost: number | null;
  amountPayableToAirbnb: number | null;
  guestNotes: string | null;
  listingName: string;
  rawEmailRef: string;
  parseIncomplete?: boolean;
}

export interface GmailClient {
  listAirbnbMessages(
    host: HostConnection,
    since: Cursor
  ): Promise<{ emails: RawEmail[]; nextCursor: Cursor }>;
}

export interface TemplateRef {
  name: string;
  language: "en" | "hi";
}

export interface SendResult {
  success: boolean;
  wamid?: string;
  error?: string;
  transient?: boolean;
  authError?: boolean;
}

export interface WhatsAppClient {
  sendTemplate(
    to: string,
    template: TemplateRef,
    vars: Record<string, string>
  ): Promise<SendResult>;
  sendText(to: string, body: string): Promise<SendResult>;
}

export interface SmsClient {
  send(to: string, body: string): Promise<SendResult>;
}

export interface BookingRow {
  bookingId: string;
  guestName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestCount: number;
  whatsappNumber: string;
  amountPaidByGuest: number | null;
  amountPayableToHost: number | null;
  amountPayableToAirbnb: number | null;
  status: string;
  createdAt: string;
}

export interface SheetsClient {
  appendBookingRow(host: HostConnection, row: BookingRow): Promise<void>;
}

export type IntegrationErrorKind = "transient" | "auth" | "permanent";

export class IntegrationError extends Error {
  constructor(
    message: string,
    public kind: IntegrationErrorKind,
    public cause?: unknown
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}
