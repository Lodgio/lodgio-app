import { describe, expect, it } from "vitest";
import { formatCreatedAt, formatStayDate, formatStayRange } from "./stay-date";

describe("formatStayDate", () => {
  it("uses an ordinal and a two-digit year", () => {
    expect(formatStayDate("2026-05-01")).toBe("1st May '26");
    expect(formatStayDate("2026-05-02")).toBe("2nd May '26");
    expect(formatStayDate("2026-05-03")).toBe("3rd May '26");
    expect(formatStayDate("2026-05-16")).toBe("16th May '26");
    expect(formatStayDate("2026-05-11")).toBe("11th May '26");
  });

  it("joins a stay", () => {
    expect(formatStayRange("2026-05-01", "2026-05-16")).toBe("1st May '26 – 16th May '26");
  });

  it("prints created time in India", () => {
    expect(formatCreatedAt("2026-04-12T09:14:00.000Z")).toBe("12th Apr '26, 14:44");
  });
});
