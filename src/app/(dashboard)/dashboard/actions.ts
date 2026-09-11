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
import { normalizeInPhone } from "@/lib/phone";

function requireInPhone(raw: string, fallbackPath: string) {
  const phone = normalizeInPhone(raw);
  if (!phone) {
    redirect(`${fallbackPath}${fallbackPath.includes("?") ? "&" : "?"}error=${encodeURIComponent("Enter a 10-digit Indian mobile number")}`);
  }
  return phone;
}

export async function updateHostProfile(formData: FormData) {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const supabase = await createClient();
  await supabase
    .from("hosts")
    .update({
      business_name: String(formData.get("business_name") ?? ""),
      phone: String(formData.get("phone") ?? "").trim()
        ? requireInPhone(String(formData.get("phone") ?? ""), "/dashboard/settings")
        : "",
    })
    .eq("id", host.id);

  revalidatePath("/dashboard/settings");
}

export async function updateHostSettings(formData: FormData) {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const supabase = await createClient();
  const settingsUpdate: {
    default_language: "en" | "hi";
    whatsapp_phone_number_id?: string | null;
    whatsapp_waba_id?: string | null;
  } = {
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

export async function createExportSheet() {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const { ensureHostSpreadsheet, exportPendingBookingsForHost } = await import(
    "@/services/sheets/sheets-export-service"
  );
  try {
    const { url } = await ensureHostSpreadsheet(host.id);
    const exported = await exportPendingBookingsForHost(host.id);
    revalidatePath("/dashboard/settings");
    redirect(
      `/dashboard/settings?sheets=created&url=${encodeURIComponent(url)}&exported=${exported}`
    );
  } catch (error) {
    // redirect() throws a special error — rethrow so Next can handle it
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not create sheet";
    redirect(`/dashboard/settings?sheets=error&detail=${encodeURIComponent(message)}`);
  }
}

export async function syncPendingSheetsExport() {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const { exportPendingBookingsForHost } = await import("@/services/sheets/sheets-export-service");
  try {
    const exported = await exportPendingBookingsForHost(host.id);
    revalidatePath("/dashboard/settings");
    redirect(`/dashboard/settings?sheets=synced&exported=${exported}`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not sync sheet";
    redirect(`/dashboard/settings?sheets=error&detail=${encodeURIComponent(message)}`);
  }
}

export async function disableSheetsExport() {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const supabase = await createClient();
  await supabase
    .from("host_settings")
    .update({
      sheets_export_enabled: false,
      sheets_status: "disabled",
    })
    .eq("host_id", host.id);

  revalidatePath("/dashboard/settings");
}

export async function createProperty(formData: FormData) {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const supabase = await createClient();
  const onboardingNextStep = formData.get("onboarding_next_step");
  const { error } = await supabase.from("properties").insert({
    host_id: host.id,
    name: String(formData.get("name") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    location_url: String(formData.get("location_url") ?? "").trim(),
    check_in_time: String(formData.get("check_in_time") ?? "2:00 PM").trim() || "2:00 PM",
    house_rules: String(formData.get("house_rules") ?? "").trim() || null,
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
      phone: requireInPhone(
        String(formData.get("phone") ?? ""),
        onboardingNextStep ? "/dashboard/onboarding?step=3" : "/dashboard/caretakers"
      ),
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

export async function updateProperty(formData: FormData) {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const propertyId = String(formData.get("property_id") ?? "");
  if (!propertyId) throw new Error("Missing property");

  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      location_url: String(formData.get("location_url") ?? "").trim(),
      check_in_time: String(formData.get("check_in_time") ?? "2:00 PM").trim() || "2:00 PM",
      house_rules: String(formData.get("house_rules") ?? "").trim() || null,
    })
    .eq("id", propertyId)
    .eq("host_id", host.id);

  if (error) throw new Error(error.message);

  if (formData.has("caretaker_id")) {
    await replacePropertyCaretaker(supabase, propertyId, String(formData.get("caretaker_id") ?? ""));
  }

  await remapUnmappedBookingsForHost(host.id);
  await retryPendingMessagingForHost(host.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/properties");
  revalidatePath("/dashboard/caretakers");
  revalidatePath("/dashboard/onboarding");
}

export async function updateCaretaker(formData: FormData) {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const caretakerId = String(formData.get("caretaker_id") ?? "");
  if (!caretakerId) throw new Error("Missing caretaker");

  const supabase = await createClient();
  const errorPath = String(formData.get("error_path") ?? "/dashboard/caretakers");
  const phone = requireInPhone(String(formData.get("phone") ?? ""), errorPath);
  const { error } = await supabase
    .from("caretakers")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      phone,
    })
    .eq("id", caretakerId)
    .eq("host_id", host.id);

  if (error) throw new Error(error.message);

  if (formData.has("property_id")) {
    const propertyId = String(formData.get("property_id") ?? "");
    await supabase.from("property_caretakers").delete().eq("caretaker_id", caretakerId);
    if (propertyId) {
      await supabase.from("property_caretakers").delete().eq("property_id", propertyId);
      await supabase.from("property_caretakers").insert({
        property_id: propertyId,
        caretaker_id: caretakerId,
      });
    }
  }

  await retryPendingMessagingForHost(host.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/properties");
  revalidatePath("/dashboard/caretakers");
  revalidatePath("/dashboard/onboarding");
}

async function replacePropertyCaretaker(
  supabase: Awaited<ReturnType<typeof createClient>>,
  propertyId: string,
  caretakerId: string
) {
  await supabase.from("property_caretakers").delete().eq("property_id", propertyId);
  if (caretakerId) {
    await supabase.from("property_caretakers").insert({
      property_id: propertyId,
      caretaker_id: caretakerId,
    });
  }
}

export async function mapPropertyCaretaker(formData: FormData) {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const supabase = await createClient();
  const propertyId = String(formData.get("property_id") ?? "");
  const caretakerId = String(formData.get("caretaker_id") ?? "");

  await replacePropertyCaretaker(supabase, propertyId, caretakerId);

  await retryPendingMessagingForHost(host.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/properties");
  revalidatePath("/dashboard/caretakers");
}

export async function requestGmailAccess(formData: FormData) {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const email = String(formData.get("gmail_email") ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/dashboard/onboarding?step=1&error=Enter+a+valid+Gmail+address");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("host_settings")
    .update({
      gmail_requested_email: email,
      gmail_access_status: "pending_review",
      gmail_access_requested_at: new Date().toISOString(),
    })
    .eq("host_id", host.id);

  if (error) {
    redirect(`/dashboard/onboarding?step=1&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirect("/dashboard/onboarding?step=1&gmail=requested");
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

export async function openGuestDocument(formData: FormData) {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const rawNext = String(formData.get("next") ?? "/dashboard/bookings");
  const next = rawNext.startsWith("/dashboard/") ? rawNext : "/dashboard/bookings";
  const fail = (message: string): never => {
    redirect(`${next}?error=${encodeURIComponent(message)}`);
  };

  const submissionId = String(formData.get("submission_id") ?? "");
  if (!submissionId) return fail("Missing guest ID");

  const service = createServiceClient();
  const { data: submission } = await service
    .from("form_submissions")
    .select("id, host_id, id_document_path")
    .eq("id", submissionId)
    .eq("host_id", host.id)
    .maybeSingle();

  const documentPath = submission?.id_document_path;
  if (!documentPath) return fail("No ID document on this submission");

  const { data: signed, error } = await service.storage
    .from("guest-documents")
    .createSignedUrl(documentPath, 120);

  const signedUrl = signed?.signedUrl;
  if (error || !signedUrl) return fail(error?.message ?? "Could not open ID document");

  redirect(signedUrl);
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
