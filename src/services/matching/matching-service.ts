import { createServiceClient } from "@/lib/supabase/service";
import { processMatchedBooking } from "@/services/messaging/messaging-service";

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  const aParts = new Set(na.split(" "));
  const bParts = nb.split(" ");
  const overlap = bParts.filter((p) => aParts.has(p)).length;
  return overlap / Math.max(aParts.size, bParts.length);
}

function daysBetween(a: string, b: string): number {
  const diff = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export async function runMatchingForHost(hostId: string) {
  const supabase = createServiceClient();
  const { data: submissions } = await supabase
    .from("form_submissions")
    .select("*")
    .eq("host_id", hostId)
    .eq("matched", false);

  for (const submission of submissions ?? []) {
    await matchSubmission(submission.id);
  }
}

export async function matchSubmission(submissionId: string) {
  const supabase = createServiceClient();
  const { data: submission } = await supabase
    .from("form_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (!submission || submission.matched) return null;

  const { data: exactBooking } = await supabase
    .from("bookings")
    .select("*")
    .eq("host_id", submission.host_id)
    .eq("airbnb_booking_id", submission.claimed_airbnb_booking_id)
    .maybeSingle();

  let booking = exactBooking;

  if (!booking) {
    const { data: candidates } = await supabase
      .from("bookings")
      .select("*")
      .eq("host_id", submission.host_id)
      .in("status", ["ingested", "awaiting_guest_form"]);

    const guestIds = (candidates ?? [])
      .map((c) => c.guest_id)
      .filter((id): id is string => !!id);
    const { data: guestRows } = guestIds.length
      ? await supabase.from("guests").select("id, name").in("id", guestIds)
      : { data: [] as Array<{ id: string; name: string | null }> };
    const guestNames = new Map((guestRows ?? []).map((g) => [g.id, g.name ?? ""]));

    const fuzzy = (candidates ?? [])
      .map((c) => {
        const guestName = c.guest_id ? guestNames.get(c.guest_id) ?? "" : "";
        const score =
          nameSimilarity(submission.name, guestName) * 0.6 +
          (daysBetween(submission.check_in ?? c.check_in, c.check_in) <= 2 ? 0.4 : 0);
        return { booking: c, score };
      })
      .filter((x) => x.score >= 0.75)
      .sort((a, b) => b.score - a.score);

    if (fuzzy.length === 1) {
      booking = fuzzy[0].booking;
    }
  }

  if (!booking) return null;

  let guestId = booking.guest_id;
  if (!guestId) {
    const { data: guest } = await supabase
      .from("guests")
      .insert({
        host_id: submission.host_id,
        relay_email: `${submission.claimed_airbnb_booking_id}@form.local`,
        name: submission.name,
        whatsapp_number: submission.whatsapp_number,
      })
      .select("id")
      .single();
    guestId = guest?.id ?? null;
  } else {
    await supabase
      .from("guests")
      .update({
        name: submission.name,
        whatsapp_number: submission.whatsapp_number,
      })
      .eq("id", guestId);
  }

  await supabase
    .from("form_submissions")
    .update({ matched: true, booking_id: booking.id })
    .eq("id", submission.id);

  await supabase
    .from("bookings")
    .update({ guest_id: guestId, status: "matched" })
    .eq("id", booking.id);

  await processMatchedBooking(booking.id);
  return booking.id;
}
