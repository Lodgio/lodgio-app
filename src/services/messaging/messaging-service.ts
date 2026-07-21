import { createServiceClient } from "@/lib/supabase/service";
import { getSmsClient, getWhatsAppClient } from "@/integrations";
import {
  buildTemplateVars,
  getTemplateConfig,
} from "@/integrations/whatsapp/templates";
import { notifyCaretaker } from "@/services/caretaker/caretaker-routing-service";
import { getBookingCaretaker } from "@/services/messaging/message-preview";
import { getBookingMessagingReadiness } from "@/services/booking/property-booking-service";
import { exportBookingToSheets } from "@/services/sheets/sheets-export-service";
import { env } from "@/lib/env";
import type { Tables } from "@/types/database";

async function hasSentMessage(
  bookingId: string,
  recipientType: "guest" | "caretaker" | "host",
  templateKind: string
) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("message_log")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("recipient_type", recipientType)
    .eq("template_kind", templateKind)
    .in("status", ["queued", "sent", "delivered"])
    .maybeSingle();
  return !!data;
}

async function logMessage(params: {
  hostId: string;
  bookingId: string;
  channel: "whatsapp" | "sms";
  recipientType: "guest" | "caretaker" | "host";
  toNumber: string;
  templateKind: string;
  wamid?: string;
  status: "queued" | "sent" | "delivered" | "failed" | "fallback_triggered";
  error?: string;
}) {
  const supabase = createServiceClient();
  await supabase.from("message_log").insert({
    host_id: params.hostId,
    booking_id: params.bookingId,
    channel: params.channel,
    recipient_type: params.recipientType,
    to_number: params.toNumber,
    template_kind: params.templateKind,
    wamid: params.wamid ?? null,
    status: params.status,
    error: params.error ?? null,
  });
}

export async function processMatchedBooking(bookingId: string) {
  const supabase = createServiceClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (!booking) return;

  const [{ data: settings }, { data: guest }, { data: property }] = await Promise.all([
    supabase.from("host_settings").select("*").eq("host_id", booking.host_id).single(),
    booking.guest_id
      ? supabase.from("guests").select("*").eq("id", booking.guest_id).maybeSingle()
      : Promise.resolve({ data: null as Tables<"guests"> | null }),
    booking.property_id
      ? supabase.from("properties").select("*").eq("id", booking.property_id).maybeSingle()
      : Promise.resolve({ data: null as Tables<"properties"> | null }),
  ]);

  const language = settings?.default_language ?? "en";
  const caretaker = await getBookingCaretaker(booking.property_id);

  if (!guest?.whatsapp_number) return;

  const readiness = await getBookingMessagingReadiness(bookingId);
  if (!readiness.ready) return;

  await supabase.from("bookings").update({ status: "messaging" }).eq("id", bookingId);

  const whatsapp = getWhatsAppClient();
  const templateKind = "guest_welcome";

  if (!(await hasSentMessage(bookingId, "guest", templateKind))) {
    const { data: templateRow } = await supabase
      .from("message_templates")
      .select("meta_template_name")
      .eq("host_id", booking.host_id)
      .eq("kind", templateKind)
      .eq("language", language)
      .maybeSingle();

    const config = getTemplateConfig(templateKind, language, templateRow?.meta_template_name);
    const vars = buildTemplateVars(config.variableKeys, {
      guest_name: guest.name ?? "Guest",
      property_name: property?.name ?? "Property",
      location_url: property?.location_url ?? "",
      check_in: booking.check_in,
      check_in_time:
        booking.check_in_time ?? property?.check_in_time ?? "",
      caretaker_name: caretaker?.name ?? "",
      caretaker_phone: caretaker?.phone ?? "",
      house_rules: property?.house_rules ?? "",
    });

    const result = await whatsapp.sendTemplate(
      guest.whatsapp_number,
      { name: config.metaName, language },
      vars
    );

    if (result.success) {
      await logMessage({
        hostId: booking.host_id,
        bookingId,
        channel: "whatsapp",
        recipientType: "guest",
        toNumber: guest.whatsapp_number,
        templateKind,
        wamid: result.wamid,
        status: "sent",
      });
    } else {
      await logMessage({
        hostId: booking.host_id,
        bookingId,
        channel: "whatsapp",
        recipientType: "guest",
        toNumber: guest.whatsapp_number,
        templateKind,
        status: "failed",
        error: result.error,
      });

      if (settings?.sms_fallback_enabled) {
        const sms = getSmsClient();
        const smsResult = await sms.send(
          guest.whatsapp_number,
          `Welcome! Check-in details for ${property?.name ?? "your stay"}: ${property?.location_url ?? ""}`
        );
        await logMessage({
          hostId: booking.host_id,
          bookingId,
          channel: "sms",
          recipientType: "guest",
          toNumber: guest.whatsapp_number,
          templateKind: "sms_fallback",
          status: smsResult.success ? "sent" : "failed",
          error: smsResult.error,
        });
      }
    }
  }

  await notifyCaretaker(bookingId);

  await supabase.from("bookings").update({ status: "completed" }).eq("id", bookingId);
  await exportBookingToSheets(bookingId);
}

export async function sendHostPasteFallback(bookingId: string) {
  const supabase = createServiceClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (!booking) return;

  const [{ data: host }, { data: guest }] = await Promise.all([
    supabase.from("hosts").select("phone, slug").eq("id", booking.host_id).single(),
    booking.guest_id
      ? supabase.from("guests").select("name").eq("id", booking.guest_id).maybeSingle()
      : Promise.resolve({ data: null as { name: string | null } | null }),
  ]);

  if (!host?.phone) return;

  const formLink = `${env.appBaseUrl}/${host.slug}/checkin`;

  if (await hasSentMessage(bookingId, "host", "host_paste_fallback")) return;

  const whatsapp = getWhatsAppClient();
  const config = getTemplateConfig("host_paste_fallback", "en");
  const result = await whatsapp.sendTemplate(
    host.phone,
    { name: config.metaName, language: "en" },
    buildTemplateVars(config.variableKeys, {
      guest_name: guest?.name ?? "Guest",
      form_link: formLink,
      booking_id: booking.airbnb_booking_id,
    })
  );

  await logMessage({
    hostId: booking.host_id,
    bookingId,
    channel: "whatsapp",
    recipientType: "host",
    toNumber: host.phone,
    templateKind: "host_paste_fallback",
    wamid: result.wamid,
    status: result.success ? "sent" : "failed",
    error: result.error,
  });
}
