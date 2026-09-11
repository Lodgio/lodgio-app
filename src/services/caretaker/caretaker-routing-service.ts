import { createServiceClient } from "@/lib/supabase/service";
import { getWhatsAppClient } from "@/integrations";
import {
  buildTemplateVars,
  getTemplateConfig,
} from "@/integrations/whatsapp/templates";
import type { Tables } from "@/types/database";
import { recordOpsEvent } from "@/lib/ops";

export async function notifyCaretaker(bookingId: string) {
  const supabase = createServiceClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (!booking) return { skipped: true, reason: "no_booking" };
  if (!booking.property_id) {
    console.warn("caretaker_skip_no_property", { bookingId });
    await recordOpsEvent({
      severity: "warning",
      kind: "caretaker_skipped",
      title: "Caretaker WhatsApp skipped — no property",
      hostId: booking.host_id,
      bookingId,
      dedupeKey: `caretaker_skipped:${bookingId}:no_property`,
      email: true,
      payload: { reason: "no_property" },
    });
    return { skipped: true, reason: "no_property" };
  }

  const [{ data: mapping }, { data: guest }, { data: property }] = await Promise.all([
    supabase
      .from("property_caretakers")
      .select("caretaker_id")
      .eq("property_id", booking.property_id)
      .limit(1)
      .maybeSingle(),
    booking.guest_id
      ? supabase.from("guests").select("*").eq("id", booking.guest_id).maybeSingle()
      : Promise.resolve({ data: null as Tables<"guests"> | null }),
    supabase.from("properties").select("*").eq("id", booking.property_id).maybeSingle(),
  ]);

  if (!mapping?.caretaker_id) {
    console.warn("caretaker_skip_unassigned", { bookingId, propertyId: booking.property_id });
    await recordOpsEvent({
      severity: "warning",
      kind: "caretaker_skipped",
      title: "Caretaker WhatsApp skipped — none assigned",
      hostId: booking.host_id,
      bookingId,
      dedupeKey: `caretaker_skipped:${booking.property_id}:unassigned`,
      email: true,
      payload: { reason: "no_caretaker", propertyId: booking.property_id },
    });
    return { skipped: true, reason: "no_caretaker" };
  }

  const { data: caretaker } = await supabase
    .from("caretakers")
    .select("*")
    .eq("id", mapping.caretaker_id)
    .single();

  if (!caretaker) {
    return { skipped: true, reason: "no_caretaker" };
  }

  const { data: existing } = await supabase
    .from("message_log")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("recipient_type", "caretaker")
    .eq("template_kind", "caretaker_notify")
    .in("status", ["queued", "sent", "delivered"])
    .maybeSingle();

  if (existing) return { skipped: true, reason: "already_sent" };

  const { data: settings } = await supabase
    .from("host_settings")
    .select("default_language")
    .eq("host_id", booking.host_id)
    .single();

  const language = settings?.default_language ?? "en";

  const { data: templateRow } = await supabase
    .from("message_templates")
    .select("meta_template_name")
    .eq("host_id", booking.host_id)
    .eq("kind", "caretaker_notify")
    .eq("language", language)
    .maybeSingle();

  const config = getTemplateConfig("caretaker_notify", language, templateRow?.meta_template_name);
  const whatsapp = getWhatsAppClient();
  const result = await whatsapp.sendTemplate(
    caretaker.phone,
    { name: config.metaName, language },
    buildTemplateVars(config.variableKeys, {
      guest_name: guest?.name ?? "Guest",
      property_name: property?.name ?? "",
      check_in: booking.check_in,
      check_in_time: booking.check_in_time ?? property?.check_in_time ?? "",
      check_out: booking.check_out,
      nights: String(booking.nights),
      guest_count: String(booking.guest_count),
      guest_phone: guest?.whatsapp_number ?? "",
      booking_source: "Airbnb",
    })
  );

  await supabase.from("message_log").insert({
    host_id: booking.host_id,
    booking_id: bookingId,
    channel: "whatsapp",
    recipient_type: "caretaker",
    to_number: caretaker.phone,
    template_kind: "caretaker_notify",
    wamid: result.wamid ?? null,
    status: result.success ? "sent" : "failed",
    error: result.error ?? null,
  });

  if (!result.success) {
    await recordOpsEvent({
      severity: "critical",
      kind: "wa_send_failed",
      title: "Caretaker WhatsApp failed",
      detail: result.error ?? "Meta rejected the caretaker template",
      hostId: booking.host_id,
      bookingId,
      dedupeKey: `wa_send_failed:${bookingId}:caretaker`,
      payload: { recipient: "caretaker", to: caretaker.phone, error: result.error ?? null },
    });
  }

  return { skipped: false, success: result.success };
}
