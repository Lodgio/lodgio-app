"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHost } from "@/lib/host";
import { pollGmailConnection } from "@/services/booking/ingest";
import {
  remapUnmappedBookingsForHost,
  retryPendingMessagingForHost,
} from "@/services/booking/property-booking-service";
import { createServiceClient } from "@/lib/supabase/service";
import { isWhatsAppEnabled } from "@/lib/features";

export async function updateHostProfile(formData: FormData) {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const supabase = await createClient();
  await supabase
    .from("hosts")
    .update({
      business_name: String(formData.get("business_name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    })
    .eq("id", host.id);

  revalidatePath("/dashboard/settings");
}

export async function updateHostSettings(formData: FormData) {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const supabase = await createClient();
  const settingsUpdate: {
    sms_fallback_enabled: boolean;
    sheets_export_enabled: boolean;
    sheets_spreadsheet_id: string | null;
    default_language: "en" | "hi";
    whatsapp_phone_number_id?: string | null;
    whatsapp_waba_id?: string | null;
  } = {
    sms_fallback_enabled: formData.get("sms_fallback_enabled") === "on",
    sheets_export_enabled: formData.get("sheets_export_enabled") === "on",
    sheets_spreadsheet_id: String(formData.get("sheets_spreadsheet_id") ?? "") || null,
    default_language: (formData.get("default_language") as "en" | "hi") ?? "en",
  };

  if (isWhatsAppEnabled()) {
    settingsUpdate.whatsapp_phone_number_id =
      String(formData.get("whatsapp_phone_number_id") ?? "") || null;
    settingsUpdate.whatsapp_waba_id = String(formData.get("whatsapp_waba_id") ?? "") || null;
  }

  await supabase.from("host_settings").update(settingsUpdate).eq("host_id", host.id);

  revalidatePath("/dashboard/settings");
}

export async function createProperty(formData: FormData) {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const supabase = await createClient();
  const onboardingNextStep = formData.get("onboarding_next_step");
  const { error } = await supabase.from("properties").insert({
    host_id: host.id,
    name: String(formData.get("name") ?? ""),
    address: String(formData.get("address") ?? ""),
    location_url: String(formData.get("location_url") ?? ""),
    check_in_time: String(formData.get("check_in_time") ?? "2:00 PM"),
    house_rules: String(formData.get("house_rules") ?? "") || null,
  });

  if (error) {
    if (onboardingNextStep) {
      redirect(
        `/dashboard/onboarding?step=2&error=${encodeURIComponent(error.message)}`
      );
    }
    throw new Error(error.message);
  }

  await remapUnmappedBookingsForHost(host.id);
  await retryPendingMessagingForHost(host.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/properties");
  revalidatePath("/dashboard/onboarding");

  if (onboardingNextStep) {
    const step = Number(onboardingNextStep);
    await supabase
      .from("host_settings")
      .update({ onboarding_step: step })
      .eq("host_id", host.id);
    redirect(`/dashboard/onboarding?step=${step}&saved=property`);
  }
}

export async function createCaretaker(formData: FormData) {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const supabase = await createClient();
  const onboardingNextStep = formData.get("onboarding_next_step");
  const { data: caretaker, error } = await supabase
    .from("caretakers")
    .insert({
      host_id: host.id,
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    })
    .select("id")
    .single();

  if (error) {
    if (onboardingNextStep) {
      redirect(
        `/dashboard/onboarding?step=3&error=${encodeURIComponent(error.message)}`
      );
    }
    throw new Error(error.message);
  }

  const propertyId = String(formData.get("property_id") ?? "");
  if (caretaker && propertyId) {
    await supabase.from("property_caretakers").delete().eq("property_id", propertyId);
    await supabase.from("property_caretakers").insert({
      property_id: propertyId,
      caretaker_id: caretaker.id,
    });
  }

  await retryPendingMessagingForHost(host.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/caretakers");
  revalidatePath("/dashboard/onboarding");

  if (onboardingNextStep) {
    const step = Number(onboardingNextStep);
    await supabase
      .from("host_settings")
      .update({ onboarding_step: step })
      .eq("host_id", host.id);
    redirect(`/dashboard/onboarding?step=${step}&saved=caretaker`);
  }
}

export async function mapPropertyCaretaker(formData: FormData) {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const supabase = await createClient();
  const propertyId = String(formData.get("property_id") ?? "");
  const caretakerId = String(formData.get("caretaker_id") ?? "");

  await supabase.from("property_caretakers").delete().eq("property_id", propertyId);
  if (caretakerId) {
    await supabase.from("property_caretakers").insert({
      property_id: propertyId,
      caretaker_id: caretakerId,
    });
  }

  await retryPendingMessagingForHost(host.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/properties");
  revalidatePath("/dashboard/caretakers");
}

export async function advanceOnboarding(formData: FormData) {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const step = Number(formData.get("step") ?? 1);
  const supabase = await createClient();
  await supabase
    .from("host_settings")
    .update({ onboarding_step: step })
    .eq("host_id", host.id);

  redirect(`/dashboard/onboarding?step=${step}`);
}

export async function revokeGmailConnection() {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const supabase = await createClient();
  await supabase
    .from("gmail_connections")
    .update({ status: "revoked" })
    .eq("host_id", host.id);

  revalidatePath("/dashboard/settings");
}

export async function syncGmailNow() {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const supabase = createServiceClient();
  const { data: connection } = await supabase
    .from("gmail_connections")
    .select("id, status")
    .eq("host_id", host.id)
    .eq("status", "active")
    .maybeSingle();

  if (!connection) {
    redirect("/dashboard/settings?gmail=needed");
  }

  try {
    const result = await pollGmailConnection(connection.id);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/bookings");
    redirect(`/dashboard/bookings?synced=${result.ingested}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail sync failed";
    redirect(`/dashboard?sync_error=${encodeURIComponent(message)}`);
  }
}
