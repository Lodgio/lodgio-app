import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  classifyAirbnbEmail,
  prepareAirbnbEmail,
} from "@/integrations/gmail/email-utils";
import { parseAirbnbEmail } from "@/integrations/gmail/parser";

const fixturesDir = path.join(process.cwd(), "fixtures/airbnb-emails");

function readFixture(name: string): string {
  return readFileSync(path.join(fixturesDir, name), "utf8");
}

describe("prepareAirbnbEmail", () => {
  it("classifies reminder and payout fixtures as non-confirmation", () => {
    const reminder = prepareAirbnbEmail(readFixture("reminder-manish-2026.eml"));
    const payout = prepareAirbnbEmail(readFixture("payout-2026.eml"));

    expect(reminder.emailType).toBe("reminder");
    expect(payout.emailType).toBe("payout");
  });

  it("extracts inner Airbnb confirmation subject and date", () => {
    const prepared = prepareAirbnbEmail(readFixture("confirmed-manish-2026.eml"));

    expect(prepared.emailType).toBe("confirmation");
    expect(prepared.subject).toContain("Reservation confirmed - Manish Dahiya arrives Jun 1");
    expect(prepared.referenceDate?.getFullYear()).toBe(2026);
    expect(prepared.text).toContain("HM2SJPMSJS");
    expect(prepared.text).toContain("Rehaish Maple");
  });
});

describe("classifyAirbnbEmail", () => {
  it("detects confirmation subject", () => {
    expect(
      classifyAirbnbEmail("Reservation confirmed - Manish Dahiya arrives Jun 1")
    ).toBe("confirmation");
  });
});

describe("parseAirbnbEmail", () => {
  it("parses legacy simplified fixture", () => {
    const parsed = parseAirbnbEmail(readFixture("sample-booking-1.eml"), "fixture-1");

    expect(parsed.parseIncomplete).toBeUndefined();
    expect(parsed.airbnbBookingId).toBe("HMABC12345");
    expect(parsed.guestName).toBe("Priya Sharma");
    expect(parsed.relayEmail).toBe("priya.sharma+abc123@guest.airbnb.com");
    expect(parsed.listingName).toBe("Rehaish Mountain Cottage");
    expect(parsed.nights).toBe(3);
    expect(parsed.guestCount).toBe(2);
    expect(parsed.checkIn).toBe("2026-06-15");
    expect(parsed.checkOut).toBe("2026-06-18");
    expect(parsed.checkInTime).toBeNull();
    expect(parsed.checkOutTime).toBeNull();
    expect(parsed.amountPaidByGuest).toBe(12500);
    expect(parsed.amountPayableToHost).toBe(10200);
    expect(parsed.amountPayableToAirbnb).toBe(2300);
  });

  it("parses real forwarded Airbnb confirmation fixture", () => {
    const prepared = prepareAirbnbEmail(readFixture("confirmed-manish-2026.eml"));
    const parsed = parseAirbnbEmail(prepared.text, "confirmed-manish", {
      subject: prepared.subject,
      referenceDate: prepared.referenceDate,
    });

    expect(parsed.parseIncomplete).toBeUndefined();
    expect(parsed.airbnbBookingId).toBe("HM2SJPMSJS");
    expect(parsed.guestName).toBe("Manish Dahiya");
    expect(parsed.relayEmail).toBeNull();
    expect(parsed.listingName).toBe("Rehaish Maple");
    expect(parsed.nights).toBe(4);
    expect(parsed.guestCount).toBe(7);
    expect(parsed.checkIn).toBe("2026-06-01");
    expect(parsed.checkOut).toBe("2026-06-05");
    expect(parsed.checkInTime).toBe("2:00 PM");
    expect(parsed.checkOutTime).toBe("12:00 PM");
    expect(parsed.amountPaidByGuest).toBe(17010);
    expect(parsed.amountPayableToHost).toBe(13689);
    expect(parsed.amountPayableToAirbnb).toBe(2511);
    expect(parsed.guestNotes).toContain("Kashmir");
  });

  it("parses full raw eml without pre-processing options", () => {
    const parsed = parseAirbnbEmail(readFixture("confirmed-manish-2026.eml"), "raw-eml");

    expect(parsed.airbnbBookingId).toBe("HM2SJPMSJS");
    expect(parsed.guestName).toBe("Manish Dahiya");
    expect(parsed.checkIn).toBe("2026-06-01");
  });
});
