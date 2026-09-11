import { describe, expect, it } from "vitest";
import { indianMobileLocal, normalizeInPhone } from "./phone";

describe("normalizeInPhone", () => {
  it("accepts 10 digits and spaced +91", () => {
    expect(normalizeInPhone("9876543210")).toBe("+919876543210");
    expect(normalizeInPhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizeInPhone("919876543210")).toBe("+919876543210");
  });

  it("rejects short or landline-like numbers", () => {
    expect(normalizeInPhone("12345")).toBeNull();
    expect(normalizeInPhone("0123456789")).toBeNull();
  });
});

describe("indianMobileLocal", () => {
  it("strips country code for inputs", () => {
    expect(indianMobileLocal("+919876543210")).toBe("9876543210");
  });
});
