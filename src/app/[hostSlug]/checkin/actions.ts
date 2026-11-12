"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { matchSubmission } from "@/services/matching/matching-service";
import { indianMobileLocal, normalizeInPhone } from "@/lib/phone";

const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const DOCUMENT_TYPES: Record<string, { contentType: string; extension: string }> = {
  "image/jpeg": { contentType: "image/jpeg", extension: "jpg" },
  "image/jpg": { contentType: "image/jpeg", extension: "jpg" },
  "image/png": { contentType: "image/png", extension: "png" },
  "image/webp": { contentType: "image/webp", extension: "webp" },
  "image/heic": { contentType: "image/heic", extension: "heic" },
  "image/heif": { contentType: "image/heif", extension: "heif" },
  "application/pdf": { contentType: "application/pdf", extension: "pdf" },
};

export type ReservedDocument =
  | { ok: true; path: string; token: string; contentType: string }
  | { ok: false; error: string };

function documentKind(contentType: string, fileName: string) {
  const named = fileName.toLowerCase();
  const fromType = DOCUMENT_TYPES[contentType.toLowerCase()];
  if (fromType) return fromType;
  if (named.endsWith(".pdf")) return DOCUMENT_TYPES["application/pdf"];
  if (named.endsWith(".png")) return DOCUMENT_TYPES["image/png"];
  if (named.endsWith(".webp")) return DOCUMENT_TYPES["image/webp"];
  if (named.endsWith(".heic")) return DOCUMENT_TYPES["image/heic"];
  if (named.endsWith(".heif")) return DOCUMENT_TYPES["image/heif"];
  if (named.endsWith(".jpg") || named.endsWith(".jpeg")) return DOCUMENT_TYPES["image/jpeg"];
  return null;
}

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

/** One-time upload slot. The phone sends the file straight to Storage, not through the app server. */
export async function reserveGuestDocumentUpload(input: {
  hostId: string;
  hostSlug: string;
  contentType: string;
  fileName: string;
  byteSize: number;
}): Promise<ReservedDocument> {
  const kind = documentKind(input.contentType || "", input.fileName || "");
  if (!kind) {
    return { ok: false, error: "Please upload a JPEG, PNG, WebP, PDF, or iPhone photo." };
  }
  if (!Number.isFinite(input.byteSize) || input.byteSize <= 0 || input.byteSize > MAX_DOCUMENT_BYTES) {
    return { ok: false, error: "That file is too large. Take a photo of the ID, or send a file under 25 MB." };
  }

  const supabase = createServiceClient();
  const { data: host } = await supabase
    .from("hosts")
    .select("id, slug")
    .eq("id", input.hostId)
    .maybeSingle();
  if (!host || host.slug !== input.hostSlug) {
    return { ok: false, error: "This check-in link is not valid." };
  }

  const submissionId = crypto.randomUUID();
  const path = `${host.id}/bookings/${submissionId}/document.${kind.extension}`;
  const { data, error } = await supabase.storage.from("guest-documents").createSignedUploadUrl(path);
  if (error || !data) {
    console.error("guest_document_slot_failed", error?.message ?? "no url");
    return { ok: false, error: "Could not start the upload. Please try again." };
  }
  return { ok: true, path: data.path, token: data.token, contentType: kind.contentType };
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

  const storagePath = String(formData.get("idDocumentPath") ?? "").trim();
  const pathPattern = new RegExp(
    `^${parsed.data.hostId}/bookings/[0-9a-f-]{36}/document\\.(jpg|png|webp|pdf|heic|heif)$`,
    "i"
  );
  if (!pathPattern.test(storagePath)) {
    fail(parsed.data.hostSlug, formData, "Please upload a photo or PDF of your ID");
  }

  const supabase = createServiceClient();
  const folder = storagePath.slice(0, storagePath.lastIndexOf("/"));
  const fileName = storagePath.slice(storagePath.lastIndexOf("/") + 1);
  const { data: existing } = await supabase.storage.from("guest-documents").list(folder, {
    search: fileName,
    limit: 5,
  });
  const stored = (existing ?? []).find((entry) => entry.name === fileName);
  const storedSize = Number(stored?.metadata?.size ?? 0);
  if (!stored || storedSize <= 0 || storedSize > MAX_DOCUMENT_BYTES) {
    fail(parsed.data.hostSlug, formData, "The ID upload did not finish. Please try again.");
  }

  const submissionId = storagePath.split("/")[2];

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
    await supabase.storage.from("guest-documents").remove([storagePath]);
    fail(parsed.data.hostSlug, formData, error?.message ?? "Submission failed. Please try again.");
  }

  let bookingId: string | null = null;
  try {
    bookingId = await matchSubmission(submission.id);
  } catch (error) {
    console.error("guest_form_match_failed", submission.id, error instanceof Error ? error.message : "failed");
  }
  const successParams: Record<string, string> = { success: "1" };
  if (bookingId) successParams.bookingId = bookingId;
  redirect(checkinPath(parsed.data.hostSlug, successParams));
}
