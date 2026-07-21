"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHost } from "@/lib/host";
import { getWhatsAppClient } from "@/integrations";
import { MESSAGE_BODIES } from "@/integrations/whatsapp/message-bodies";

export async function submitWhatsAppNumber(formData: FormData) {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const phone = String(formData.get("phone") ?? "").trim();
  if (!phone) {
    redirect("/welcome/step-1?error=" + encodeURIComponent("Please enter your WhatsApp number"));
  }

  const supabase = await createClient();
  await supabase.from("hosts").update({ phone }).eq("id", host.id);

  const result = await getWhatsAppClient().sendText(phone, MESSAGE_BODIES.host_welcome);

  if (!result.success) {
    redirect(
      "/welcome/step-1?error=" +
        encodeURIComponent(result.error ?? "Could not send the WhatsApp message. Try again.")
    );
  }

  // Reset verification if the number changed, so a fresh confirmation is required.
  await supabase
    .from("host_settings")
    .update({ whatsapp_test_sent_at: new Date().toISOString(), whatsapp_verified_at: null })
    .eq("host_id", host.id);

  redirect("/welcome/step-1?sent=1");
}

export async function confirmWhatsAppReceived() {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const supabase = await createClient();
  await supabase
    .from("host_settings")
    .update({ whatsapp_verified_at: new Date().toISOString() })
    .eq("host_id", host.id);

  redirect("/welcome/step-2");
}

export async function confirmCheckinLink() {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const supabase = await createClient();
  await supabase
    .from("host_settings")
    .update({ checkin_link_confirmed_at: new Date().toISOString() })
    .eq("host_id", host.id);

  redirect("/dashboard");
}
