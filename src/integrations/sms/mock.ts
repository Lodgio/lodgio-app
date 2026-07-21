import type { SendResult, SmsClient } from "@/integrations/types";

export class MockSmsClient implements SmsClient {
  async send(to: string, body: string): Promise<SendResult> {
    console.info("[MockSms] send", { to, body });
    return { success: true, wamid: `mock-sms-${Date.now()}` };
  }
}
