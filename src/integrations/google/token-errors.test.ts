import { describe, expect, it } from "vitest";
import { googleErrorCode, isRejectedGoogleToken } from "@/integrations/google/token-errors";

describe("isRejectedGoogleToken", () => {
  it("detects invalid_grant on the error and on the Google response body", () => {
    const error = Object.assign(new Error("Request failed with status code 400"), {
      response: { data: { error: "invalid_grant" } },
    });
    expect(isRejectedGoogleToken(error)).toBe(true);
    expect(googleErrorCode(error)).toBe("invalid_grant");
  });

  it("detects invalid_token without treating unrelated API errors as a revoke", () => {
    expect(isRejectedGoogleToken(new Error("invalid_token"))).toBe(true);
    expect(isRejectedGoogleToken(new Error("Requested entity was not found"))).toBe(false);
    expect(googleErrorCode(new Error("Requested entity was not found"))).toBe(
      "google_request_failed"
    );
  });
});
