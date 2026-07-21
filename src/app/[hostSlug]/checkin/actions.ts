"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { matchSubmission } from "@/services/matching/matching-service";

const guestFormSchema = z.object({
  hostId: z.string().uuid(),
  hostSlug: z.string().min(1),
  name: z.string().min(2),
  whatsappNumber: z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid phone number with country code"),
  claimedAirbnbBookingId: z.string().min(4),
  idDocumentType: z.enum(["aadhaar", "passport", "other"]),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guestCount: z.coerce.number().int().positive().optional(),
});

function checkinPath(hostSlug: string, params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  return `/${hostSlug}/checkin${query ? `?${query}` : ""}`;
}

export async function submitGuestForm(formData: FormData) {
  const hostSlugFallback = String(formData.get("hostSlug") ?? "").trim();
  const parsed = guestFormSchema.safeParse({
    hostId: formData.get("hostId"),
    hostSlug: hostSlugFallback,
    name: formData.get("name"),
    whatsappNumber: formData.get("whatsappNumber"),
    claimedAirbnbBookingId: formData.get("claimedAirbnbBookingId"),
    idDocumentType: formData.get("idDocumentType"),
    checkIn: formData.get("checkIn") || undefined,
    checkOut: formData.get("checkOut") || undefined,
    guestCount: formData.get("guestCount") || undefined,
  });

  if (!parsed.success) {
    redirect(
      checkinPath(
        hostSlugFallback || "checkin",
        { error: parsed.error.issues[0]?.message ?? "Invalid form" }
      )
    );
  }

  const file = formData.get("idDocument") as File | null;
  const hasFile = Boolean(file && file.size > 0);
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (hasFile && file && (!allowedTypes.includes(file.type) || file.size > 10 * 1024 * 1024)) {
    redirect(checkinPath(parsed.data.hostSlug, { error: "Invalid file type or size" }));
  }

  const supabase = createServiceClient();
  const submissionId = crypto.randomUUID();
  let storagePath = "";

  if (hasFile && file) {
    const extension = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase().replace(/[^a-z0-9]/g, "")
      : "";
    const safeExtension = extension ? `.${extension}` : "";
    storagePath = `${parsed.data.hostId}/bookings/${submissionId}/document${safeExtension}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("guest-documents")
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      redirect(checkinPath(parsed.data.hostSlug, { error: uploadError.message }));
    }
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
    redirect(
      checkinPath(parsed.data.hostSlug, {
        error: error?.message ?? "Submission failed",
      })
    );
  }

  const bookingId = await matchSubmission(submission.id);
  const successParams: Record<string, string> = { success: "1" };
  if (bookingId) successParams.bookingId = bookingId;
  redirect(checkinPath(parsed.data.hostSlug, successParams));
}
