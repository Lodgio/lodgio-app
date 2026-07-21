import type { SendResult, SmsClient } from "@/integrations/types";
import { env } from "@/lib/env";

export class RealSmsClient implements SmsClient {
  async send(to: string, body: string): Promise<SendResult> {
    if (env.smsProvider === "msg91") {
      const response = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          authkey: env.smsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipients: [{ mobiles: to.replace(/\D/g, ""), var: body }],
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: await response.text(),
          transient: response.status >= 500,
        };
      }
      return { success: true };
    }

    return { success: false, error: `Unsupported SMS provider: ${env.smsProvider}` };
  }
}
