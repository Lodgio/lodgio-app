/** True when Google has already rejected the refresh token. */
export function isRejectedGoogleToken(error: unknown): boolean {
  const text = collectErrorText(error).toLowerCase();
  return text.includes("invalid_grant") || text.includes("invalid_token");
}

/** Short code safe to log. Never returns request bodies or credential material. */
export function googleErrorCode(error: unknown): string {
  if (isRejectedGoogleToken(error)) return "invalid_grant";
  if (error instanceof Error && error.name && error.name !== "Error") return error.name;
  return "google_request_failed";
}

function collectErrorText(error: unknown, depth = 0): string {
  if (!error || depth > 4) return "";
  if (typeof error === "string") return error.slice(0, 300);
  if (error instanceof Error) {
    const extra = error as { cause?: unknown; response?: { data?: unknown } };
    return [
      error.message,
      collectErrorText(extra.cause, depth + 1),
      collectErrorText(extra.response?.data, depth + 1),
    ].join(" ");
  }
  if (typeof error === "object") {
    const record = error as { error?: unknown; error_description?: unknown; message?: unknown };
    return [record.error, record.error_description, record.message]
      .filter((part): part is string => typeof part === "string")
      .join(" ")
      .slice(0, 300);
  }
  return "";
}
