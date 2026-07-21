import type { SendResult, TemplateRef, WhatsAppClient } from "@/integrations/types";
import { env } from "@/lib/env";

export class RealWhatsAppClient implements WhatsAppClient {
  private baseUrl = `https://graph.facebook.com/${env.whatsappGraphVersion}/${env.whatsappPhoneNumberId}/messages`;

  async sendTemplate(
    to: string,
    template: TemplateRef,
    vars: Record<string, string>
  ): Promise<SendResult> {
    const parameters = Object.values(vars).map((text) => ({ type: "text", text }));

    return this.post({
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "template",
      template: {
        name: template.name,
        language: { code: template.language },
        components: [{ type: "body", parameters }],
      },
    });
  }

  async sendText(to: string, body: string): Promise<SendResult> {
    return this.post({
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: { preview_url: false, body },
    });
  }

  private async post(payload: Record<string, unknown>): Promise<SendResult> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsappSystemUserToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message: string; code?: number };
    };

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message ?? "WhatsApp send failed",
        transient: response.status >= 500,
        authError: response.status === 401 || data.error?.code === 190,
      };
    }

    return {
      success: true,
      wamid: data.messages?.[0]?.id,
    };
  }
}
