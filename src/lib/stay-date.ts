const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ordinal(day: number): string {
  const teen = day % 100;
  if (teen >= 11 && teen <= 13) return `${day}th`;
  if (day % 10 === 1) return `${day}st`;
  if (day % 10 === 2) return `${day}nd`;
  if (day % 10 === 3) return `${day}rd`;
  return `${day}th`;
}

/** Stay dates stored as YYYY-MM-DD, shown as 1st May '26. */
export function formatStayDate(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return value;
  return `${ordinal(Number(match[3]))} ${month} '${match[1].slice(2)}`;
}

export function formatStayRange(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined
): string {
  return `${formatStayDate(checkIn)} – ${formatStayDate(checkOut)}`;
}

/** Timestamps shown in India time, same voice as stay dates. */
export function formatCreatedAt(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const day = Number(pick("day"));
  if (!day) return value;
  return `${ordinal(day)} ${pick("month")} '${pick("year")}, ${pick("hour")}:${pick("minute")}`;
}
