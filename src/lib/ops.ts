import { createServiceClient } from "@/lib/supabase/service";
import { env } from "@/lib/env";
import type { Json } from "@/types/database";

export type OpsSeverity = "info" | "warning" | "critical";

export type OpsKind =
  | "wa_send_failed"
  | "wa_delivery_failed"
  | "caretaker_skipped"
  | "gmail_needs_reconnect"
  | "gmail_parse_failed"
  | "booking_ingest_failed";

const EMAIL_WINDOW_MS: Record<OpsKind, number> = {
  wa_send_failed: 6 * 60 * 60 * 1000,
  wa_delivery_failed: 6 * 60 * 60 * 1000,
  caretaker_skipped: 12 * 60 * 60 * 1000,
  gmail_needs_reconnect: 24 * 60 * 60 * 1000,
  gmail_parse_failed: 6 * 60 * 60 * 1000,
  booking_ingest_failed: 6 * 60 * 60 * 1000,
};

export async function recordOpsEvent(input: {
  severity: OpsSeverity;
  kind: OpsKind;
  title: string;
  detail?: string;
  hostId?: string | null;
  bookingId?: string | null;
  dedupeKey?: string;
  payload?: Record<string, Json | undefined>;
  email?: boolean;
}) {
  try {
    const supabase = createServiceClient();
    const payload = (input.payload ?? {}) as Json;
    await supabase.from("ops_events").insert({
      severity: input.severity,
      kind: input.kind,
      title: input.title,
      detail: input.detail ?? null,
      host_id: input.hostId ?? null,
      booking_id: input.bookingId ?? null,
      dedupe_key: input.dedupeKey ?? null,
      payload,
    });

    const shouldEmail = input.email ?? input.severity === "critical";
    if (shouldEmail) {
      await maybeEmailOpsAlert(input);
    }
  } catch (error) {
    console.error("ops_event_failed", input.kind, error);
  }
}

async function maybeEmailOpsAlert(input: {
  kind: OpsKind;
  title: string;
  detail?: string;
  hostId?: string | null;
  bookingId?: string | null;
  dedupeKey?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = env.opsAlertEmail;
  const from = env.opsAlertFrom;
  if (!apiKey || !to || !from) return;

  const supabase = createServiceClient();
  const windowMs = EMAIL_WINDOW_MS[input.kind];
  const since = new Date(Date.now() - windowMs).toISOString();
  const dedupe = input.dedupeKey ?? `${input.kind}:${input.hostId ?? "none"}`;

  const { count } = await supabase
    .from("ops_events")
    .select("id", { count: "exact", head: true })
    .eq("kind", input.kind)
    .eq("dedupe_key", dedupe)
    .gte("created_at", since);

  // This insert already landed; count includes it. Email only on the first in the window.
  if ((count ?? 0) > 1) return;

  let hostLabel = input.hostId ?? "unknown host";
  if (input.hostId) {
    const { data: host } = await supabase
      .from("hosts")
      .select("business_name, slug")
      .eq("id", input.hostId)
      .maybeSingle();
    if (host) hostLabel = `${host.business_name || host.slug} (${host.slug})`;
  }

  const lines = [
    input.title,
    input.detail ? `\n${input.detail}` : "",
    `\nHost: ${hostLabel}`,
    input.bookingId ? `Booking: ${input.bookingId}` : "",
    `\nOpen admin: ${env.appBaseUrl}/admin/ops`,
  ].filter(Boolean);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `[Lodgio] ${input.title}`,
      text: lines.join("\n"),
    }),
  });

  if (!response.ok) {
    console.error("ops_alert_email_failed", response.status, await response.text());
  }
}
