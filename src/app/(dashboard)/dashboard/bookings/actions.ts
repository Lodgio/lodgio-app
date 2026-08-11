"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHost } from "@/lib/host";
import { retryPendingMessagingForHost } from "@/services/booking/property-booking-service";
import { processMatchedBooking } from "@/services/messaging/messaging-service";
import {
  buildBookingMessages,
  type BookingMessagePreview,
} from "@/services/messaging/message-preview";

export async function loadBookingTestMessages(
  bookingId: string
): Promise<BookingMessagePreview[]> {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");
  return buildBookingMessages(bookingId, host.id);
}

export async function assignBookingProperty(formData: FormData) {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const bookingId = String(formData.get("booking_id") ?? "");
  const propertyId = String(formData.get("property_id") ?? "");
  if (!bookingId || !propertyId) throw new Error("Missing booking or property");

  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ property_id: propertyId })
    .eq("id", bookingId)
    .eq("host_id", host.id);

  if (error) throw new Error(error.message);

  await retryPendingMessagingForHost(host.id);
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard");
}

export async function sendBookingMessages(formData: FormData) {
  const host = await getCurrentHost();
  if (!host) throw new Error("Unauthorized");

  const bookingId = String(formData.get("booking_id") ?? "");
  if (!bookingId) throw new Error("Missing booking");

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .eq("host_id", host.id)
    .maybeSingle();

  if (!booking) throw new Error("Booking not found");
  if (booking.status !== "matched") throw new Error("Booking is not waiting to send messages");

  await processMatchedBooking(bookingId);
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard");
}
