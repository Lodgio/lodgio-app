import type { SendResult, TemplateRef, WhatsAppClient } from "@/integrations/types";

export class MockWhatsAppClient implements WhatsAppClient {
  async sendTemplate(
    to: string,
    template: TemplateRef,
    vars: Record<string, string>
  ): Promise<SendResult> {
    console.info("[MockWhatsApp] template send", { to, template, vars });
    return {
      success: true,
      wamid: `mock-wamid-${Date.now()}`,
    };
  }

  async sendText(to: string, body: string): Promise<SendResult> {
    console.info("[MockWhatsApp] text send", { to, body });
    return {
      success: true,
      wamid: `mock-wamid-${Date.now()}`,
    };
  }
}
