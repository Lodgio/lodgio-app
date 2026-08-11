import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { env } from "@/lib/env";
import { getSmsClient } from "@/integrations";

function verifySignature(payload: string, signature: string | null): boolean {
  if (!signature || !env.metaAppSecret) return false;
  const expected = createHmac("sha256", env.metaAppSecret)
    .update(payload)
    .digest("hex");
  const received = signature.replace("sha256=", "");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.whatsappWebhookVerifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          statuses?: Array<{
            id: string;
            status: string;
            recipient_id?: string;
          }>;
        };
      }>;
    }>;
  };

  const supabase = createServiceClient();

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const status of change.value?.statuses ?? []) {
        const mapped =
          status.status === "delivered"
            ? "delivered"
            : status.status === "sent"
              ? "sent"
              : status.status === "failed"
                ? "failed"
                : null;

        if (!mapped) continue;

        const { data: logEntry } = await supabase
          .from("message_log")
          .select("*")
          .eq("wamid", status.id)
          .maybeSingle();

        if (!logEntry) continue;

        await supabase
          .from("message_log")
          .update({ status: mapped })
          .eq("id", logEntry.id);

        if (
          mapped === "failed" &&
          logEntry.recipient_type === "guest" &&
          logEntry.template_kind === "guest_welcome"
        ) {
          const { data: settings } = await supabase
            .from("host_settings")
            .select("sms_fallback_enabled")
            .eq("host_id", logEntry.host_id)
            .single();

          if (settings?.sms_fallback_enabled && status.recipient_id) {
            const sms = getSmsClient();
            await sms.send(status.recipient_id, "Your check-in details are available. Please contact your host.");
            await supabase.from("message_log").insert({
              host_id: logEntry.host_id,
              booking_id: logEntry.booking_id,
              channel: "sms",
              recipient_type: "guest",
              to_number: status.recipient_id,
              template_kind: "sms_fallback",
              status: "fallback_triggered",
            });
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
