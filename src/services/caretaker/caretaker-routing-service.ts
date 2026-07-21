import { createServiceClient } from "@/lib/supabase/service";
import { getWhatsAppClient } from "@/integrations";
import {
  buildTemplateVars,
  getTemplateConfig,
} from "@/integrations/whatsapp/templates";
import type { Tables } from "@/types/database";

export async function notifyCaretaker(bookingId: string) {
  const supabase = createServiceClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (!booking?.property_id) {
    console.warn("caretaker_skip_no_property", { bookingId });
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
      guest_phone: guest?.whatsapp_number ?? "",
      guest_count: String(booking.guest_count),
      nights: String(booking.nights),
      check_in: booking.check_in,
      check_out: booking.check_out,
      property_name: property?.name ?? "",
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

  return { skipped: false, success: result.success };
}
