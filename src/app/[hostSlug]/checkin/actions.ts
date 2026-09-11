"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { matchSubmission } from "@/services/matching/matching-service";
import { indianMobileLocal, normalizeInPhone } from "@/lib/phone";
import { prepareGuestIdUpload } from "@/lib/guest-id-upload";

const guestFormSchema = z.object({
  hostId: z.string().uuid(),
  hostSlug: z.string().min(1),
  name: z.string().min(2),
  whatsappNumber: z
    .string()
    .regex(/^\+[1-9]\d{9,14}$/, "Enter a 10-digit Indian WhatsApp number"),
  claimedAirbnbBookingId: z.string().min(4),
  idDocumentType: z.enum(["aadhaar", "passport", "other"]),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guestCount: z.coerce.number().int().positive().optional(),
});

function preservedFields(formData: FormData): Record<string, string> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = indianMobileLocal(String(formData.get("whatsappNumber") ?? ""));
  const booking = String(formData.get("claimedAirbnbBookingId") ?? "").trim();
  const idType = String(formData.get("idDocumentType") ?? "").trim();
  const fields: Record<string, string> = {};
  if (name) fields.name = name;
  if (phone) fields.phone = phone;
  if (booking) fields.booking = booking;
  if (idType) fields.idType = idType;
  return fields;
}

function checkinPath(hostSlug: string, params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  return `/${hostSlug}/checkin${query ? `?${query}` : ""}`;
}

function fail(hostSlug: string, formData: FormData, error: string): never {
  redirect(checkinPath(hostSlug || "checkin", { error, ...preservedFields(formData) }));
}

export async function submitGuestForm(formData: FormData) {
  const hostSlugFallback = String(formData.get("hostSlug") ?? "").trim();
  const phone = normalizeInPhone(String(formData.get("whatsappNumber") ?? ""));
  if (!phone) {
    fail(hostSlugFallback, formData, "Enter a 10-digit Indian WhatsApp number");
  }

  const parsed = guestFormSchema.safeParse({
    hostId: formData.get("hostId"),
    hostSlug: hostSlugFallback,
    name: formData.get("name"),
    whatsappNumber: phone,
    claimedAirbnbBookingId: formData.get("claimedAirbnbBookingId"),
    idDocumentType: formData.get("idDocumentType"),
    checkIn: formData.get("checkIn") || undefined,
    checkOut: formData.get("checkOut") || undefined,
    guestCount: formData.get("guestCount") || undefined,
  });

  if (!parsed.success) {
    fail(hostSlugFallback, formData, parsed.error.issues[0]?.message ?? "Please check the form and try again");
  }

  const file = formData.get("idDocument") as File | null;
  if (!file || file.size === 0) {
    fail(parsed.data.hostSlug, formData, "Please upload a photo or PDF of your ID");
  }

  let upload: Awaited<ReturnType<typeof prepareGuestIdUpload>>;
  try {
    upload = await prepareGuestIdUpload(file);
  } catch (error) {
    fail(
      parsed.data.hostSlug,
      formData,
      error instanceof Error ? error.message : "Please upload a JPEG, PNG, WebP, or PDF of your ID"
    );
  }

  const supabase = createServiceClient();
  const submissionId = crypto.randomUUID();
  const storagePath = `${parsed.data.hostId}/bookings/${submissionId}/document.${upload.extension}`;

  const { error: uploadError } = await supabase.storage
    .from("guest-documents")
    .upload(storagePath, upload.buffer, { contentType: upload.contentType, upsert: false });

  if (uploadError) {
    fail(parsed.data.hostSlug, formData, uploadError.message);
  }

  const { data: submission, error } = await supabase
    .from("form_submissions")
    .insert({
      id: submissionId,
      host_id: parsed.data.hostId,
      claimed_airbnb_booking_id: parsed.data.claimedAirbnbBookingId,
      name: parsed.data.name,
      whatsapp_number: parsed.data.whatsappNumber,
      id_document_path: storagePath,
      id_document_type: parsed.data.idDocumentType,
      check_in: parsed.data.checkIn ?? null,
      check_out: parsed.data.checkOut ?? null,
      guest_count: parsed.data.guestCount ?? null,
      matched: false,
    })
    .select("id")
    .single();

  if (error || !submission) {
    fail(parsed.data.hostSlug, formData, error?.message ?? "Submission failed. Please try again.");
  }

  const bookingId = await matchSubmission(submission.id);
  const successParams: Record<string, string> = { success: "1" };
  if (bookingId) successParams.bookingId = bookingId;
  redirect(checkinPath(parsed.data.hostSlug, successParams));
}
