import { env } from "@/lib/env";
import type {
  GmailClient,
  SheetsClient,
  SmsClient,
  WhatsAppClient,
} from "@/integrations/types";
import { MockGmailClient } from "@/integrations/gmail/mock";
import { RealGmailClient } from "@/integrations/gmail/real";
import { MockWhatsAppClient } from "@/integrations/whatsapp/mock";
import { RealWhatsAppClient } from "@/integrations/whatsapp/real";
import { MockSmsClient } from "@/integrations/sms/mock";
import { RealSmsClient } from "@/integrations/sms/real";
import { MockSheetsClient } from "@/integrations/sheets/mock";
import { RealSheetsClient } from "@/integrations/sheets/real";

export function getGmailClient(): GmailClient {
  return env.useMockGmail ? new MockGmailClient() : new RealGmailClient();
}

export function getWhatsAppClient(): WhatsAppClient {
  return env.useMockWhatsApp ? new MockWhatsAppClient() : new RealWhatsAppClient();
}

export function getSmsClient(): SmsClient {
  return env.useMockSms ? new MockSmsClient() : new RealSmsClient();
}

export function getSheetsClient(): SheetsClient {
  return env.useMockSheets ? new MockSheetsClient() : new RealSheetsClient();
}
