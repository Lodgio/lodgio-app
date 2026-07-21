export type MessageBodyKind = "host_welcome" | "guest_welcome" | "caretaker_notify";

export const MESSAGE_BODIES: Record<MessageBodyKind, string> = {
  host_welcome: `Welcome to Lodgio! This message confirms your WhatsApp number is set up correctly.

Head back to Lodgio and tap "Yes, I received it" to continue.`,
  guest_welcome: `🌿 Hello {{guest_name}},

Thank you for choosing to stay with us! We’re delighted to host you and hope you have a wonderful visit.

📅 Check-in: {{check_in}} after {{check_in_time}}

🌤️ Weather Forecast: {{weather_summary}}
(We recommend carrying {{weather_recommendation}} if needed.)

📍 Property Location:
{{location_url}}

👤 Your Local Host/Caretaker
{{caretaker_name}}
📞 {{caretaker_phone}}

Feel free to contact them for directions, check-in assistance, or any help during your stay.

A few quick notes:
• Please share your expected arrival time in advance.
• Check-in is available from {{check_in_time}} onwards.
• If you need anything before or during your stay, simply reply to this message—we’re always happy to help.

We look forward to welcoming you and wish you a safe journey!

Warm regards,
{{property_name}}`,
  caretaker_notify: `Guest Check-in Details

Guest Name: {{guest_name}}
Check-in: {{check_in}} | {{check_in_time}}
Check-out: {{check_out}}
Stay: {{nights}} Night(s)

Guests: {{guest_count}}
Guest Contact: {{guest_phone}}

Booking Type: {{booking_type}}

Please ensure the property is cleaned, ready, and handed over before the guest’s arrival. Coordinate directly with the guest if there are any delays or if they need assistance reaching the property.

Kindly confirm once the guest has checked in successfully.`,
};

export function renderMessageBody(
  kind: MessageBodyKind,
  values: Record<string, string | number | null | undefined>
): string {
  return MESSAGE_BODIES[kind].replace(/\{\{([a-z0-9_]+)\}\}/g, (token, key: string) => {
    const value = values[key];
    return value === null || value === undefined || value === "" ? token : String(value);
  });
}
