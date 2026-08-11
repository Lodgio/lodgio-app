export type MessageBodyKind = "host_welcome" | "guest_welcome" | "caretaker_notify";

export const MESSAGE_BODIES: Record<MessageBodyKind, string> = {
  host_welcome: `Welcome to Lodgio! This message confirms your WhatsApp number is set up correctly.

Head back to Lodgio and tap "Yes, I received it" to continue.`,
  // Templates below are legacy static strings; prefer composeMessageBody for live/preview text.
  guest_welcome: "",
  caretaker_notify: "",
};

function hasValue(value: string | number | null | undefined): boolean {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function line(text: string): string {
  return text.trimEnd();
}

/** Build free-text bodies, omitting sections when data is missing (no {{placeholders}}). */
export function composeMessageBody(
  kind: MessageBodyKind,
  values: Record<string, string | number | null | undefined>
): string {
  if (kind === "host_welcome") {
    return MESSAGE_BODIES.host_welcome;
  }

  if (kind === "guest_welcome") {
    const parts: string[] = [
      line(`🌿 Hello ${values.guest_name ?? "Guest"},`),
      "",
      "Thank you for choosing to stay with us! We're delighted to host you and hope you have a wonderful visit.",
    ];

    if (hasValue(values.check_in)) {
      const time = hasValue(values.check_in_time) ? ` after ${values.check_in_time}` : "";
      parts.push("", line(`📅 Check-in: ${values.check_in}${time}`));
    }

    if (hasValue(values.weather_summary)) {
      parts.push("", line(`🌤️ Weather Forecast: ${values.weather_summary}`));
      if (hasValue(values.weather_recommendation)) {
        parts.push(line(`(We recommend carrying ${values.weather_recommendation} if needed.)`));
      }
    }

    if (hasValue(values.location_url)) {
      parts.push("", "📍 Property Location:", line(String(values.location_url)));
    }

    if (hasValue(values.caretaker_name) || hasValue(values.caretaker_phone)) {
      parts.push("", "👤 Your Local Host/Caretaker");
      if (hasValue(values.caretaker_name)) parts.push(line(String(values.caretaker_name)));
      if (hasValue(values.caretaker_phone)) parts.push(line(`📞 ${values.caretaker_phone}`));
      parts.push(
        "",
        "Feel free to contact them for directions, check-in assistance, or any help during your stay."
      );
    }

    const notes: string[] = ["• Please share your expected arrival time in advance."];
    if (hasValue(values.check_in_time)) {
      notes.push(`• Check-in is available from ${values.check_in_time} onwards.`);
    }
    notes.push(
      "• If you need anything before or during your stay, simply reply to this message—we're always happy to help."
    );
    parts.push("", "A few quick notes:", ...notes);

    parts.push(
      "",
      "We look forward to welcoming you and wish you a safe journey!",
      "",
      "Warm regards,",
      line(String(values.property_name ?? "Your host"))
    );

    return parts.join("\n");
  }

  // caretaker_notify
  const rows: string[] = ["Guest Check-in Details", ""];
  if (hasValue(values.guest_name)) rows.push(line(`Guest Name: ${values.guest_name}`));
  if (hasValue(values.check_in) || hasValue(values.check_in_time)) {
    const checkIn = [
      hasValue(values.check_in) ? String(values.check_in) : null,
      hasValue(values.check_in_time) ? String(values.check_in_time) : null,
    ]
      .filter(Boolean)
      .join(" | ");
    rows.push(line(`Check-in: ${checkIn}`));
  }
  if (hasValue(values.check_out)) rows.push(line(`Check-out: ${values.check_out}`));
  if (hasValue(values.nights)) rows.push(line(`Stay: ${values.nights} Night(s)`));
  rows.push("");
  if (hasValue(values.guest_count)) rows.push(line(`Guests: ${values.guest_count}`));
  if (hasValue(values.guest_phone)) rows.push(line(`Guest Contact: ${values.guest_phone}`));
  if (hasValue(values.booking_type)) rows.push(line(`Booking Type: ${values.booking_type}`));
  if (hasValue(values.property_name)) rows.push(line(`Property: ${values.property_name}`));

  rows.push(
    "",
    "Please ensure the property is cleaned, ready, and handed over before the guest's arrival. Coordinate directly with the guest if there are any delays or if they need assistance reaching the property.",
    "",
    "Kindly confirm once the guest has checked in successfully."
  );

  return rows.join("\n");
}

/** @deprecated Prefer composeMessageBody — keeps tokens only for simple host_welcome. */
export function renderMessageBody(
  kind: MessageBodyKind,
  values: Record<string, string | number | null | undefined>
): string {
  if (kind === "guest_welcome" || kind === "caretaker_notify") {
    return composeMessageBody(kind, values);
  }
  return MESSAGE_BODIES[kind].replace(/\{\{([a-z0-9_]+)\}\}/g, (token, key: string) => {
    const value = values[key];
    return value === null || value === undefined || value === "" ? token : String(value);
  });
}
