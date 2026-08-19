import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  classifyAirbnbEmail,
  extractGmailApiBody,
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

describe("Gmail API native confirmation", () => {
  it("classifies from the header subject when the body has no Subject: line", () => {
    const html = `
      <html><body>
        <p>New booking confirmed! Sadeeq Ahmed arrives Aug 19.</p>
        <a href="https://www.airbnb.co.in/hosting/reservations/details/HMZB3YZBBA">View</a>
        <p>Check-in</p><p>Wed, Aug 19</p><p>2:00 PM</p>
        <p>Checkout</p><p>Thu, Aug 20</p><p>12:00 PM</p>
        <p>Rehaish Maple</p>
        <p>Entire home/apt</p>
        <p>Guests: 2</p>
        <p>You earn ₹10,000.00</p>
      </body></html>
    `;
    const prepared = prepareAirbnbEmail(
      html,
      "2026-08-19T11:04:00.000Z",
      "Reservation confirmed - Sadeeq Ahmed Wani arrives Aug 19"
    );

    expect(prepared.emailType).toBe("confirmation");
    expect(prepared.subject).toContain("Sadeeq Ahmed");

    const parsed = parseAirbnbEmail(prepared.text, "native-sadeeq", {
      subject: prepared.subject,
      referenceDate: prepared.referenceDate,
    });
    expect(parsed.parseIncomplete).toBeUndefined();
    expect(parsed.airbnbBookingId).toBe("HMZB3YZBBA");
    expect(parsed.guestName).toBe("Sadeeq Ahmed Wani");
    expect(parsed.listingName).toBe("Rehaish Maple");
    expect(parsed.checkIn).toBe("2026-08-19");
    expect(parsed.checkOut).toBe("2026-08-20");
  });

  it("walks nested multipart payloads and decodes base64url", () => {
    const html =
      "<html><body>Reservation confirmed inner html HMZB3YZBBA</body></html>";
    const encoded = Buffer.from(html)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

    const body = extractGmailApiBody({
      payload: {
        mimeType: "multipart/mixed",
        headers: [{ name: "Subject", value: "Reservation confirmed - Sadeeq arrives Aug 19" }],
        parts: [
          {
            mimeType: "multipart/alternative",
            parts: [
              { mimeType: "text/plain", body: { data: "" } },
              { mimeType: "text/html", body: { data: encoded } },
            ],
          },
        ],
      },
    });

    expect(body).toContain("HMZB3YZBBA");
    expect(body).toContain("inner html");
  });

  it("prefers richer HTML over a short text/plain teaser", () => {
    const encode = (value: string) =>
      Buffer.from(value)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");

    const body = extractGmailApiBody({
      payload: {
        mimeType: "multipart/alternative",
        parts: [
          {
            mimeType: "text/plain",
            body: { data: encode("New booking confirmed! Sadeeq Ahmed arrives Aug 19.") },
          },
          {
            mimeType: "text/html",
            body: {
              data: encode(`
                <div>
                  <p>New booking confirmed! Sadeeq Ahmed arrives Aug 19.</p>
                  <a href="https://www.airbnb.co.in/hosting/reservations/details/HMZB3YZBBA">View</a>
                  <p>Check-in</p><p>Wed, Aug 19</p>
                  <p>Checkout</p><p>Thu, Aug 20</p>
                  <p>Rehaish Maple</p>
                  <p>Entire home/apt</p>
                </div>
              `),
            },
          },
        ],
      },
    });

    expect(body).toContain("HMZB3YZBBA");
    expect(body).toContain("Rehaish Maple");

    const prepared = prepareAirbnbEmail(
      body,
      "2026-08-19T11:04:00.000Z",
      "Reservation confirmed - Sadeeq Ahmed Wani arrives Aug 19"
    );
    const parsed = parseAirbnbEmail(prepared.text, "plain-teaser", {
      subject: prepared.subject,
      referenceDate: prepared.referenceDate,
    });
    expect(parsed.parseIncomplete).toBeUndefined();
    expect(parsed.airbnbBookingId).toBe("HMZB3YZBBA");
    expect(parsed.listingName).toBe("Rehaish Maple");
  });

  it("parses div-only HTML and subject arrival date", () => {
    const html = `
      <div>
        Confirmation code HMZB3YZBBA
        Check in Aug 19, 2026
        Check out Aug 21, 2026
        [image: Rehaish Maple]
      </div>
    `;
    const prepared = prepareAirbnbEmail(
      html,
      "2026-08-19T11:04:00.000Z",
      "Reservation confirmed - Sadeeq Ahmed Wani arrives Aug 19"
    );
    expect(prepared.text).not.toContain("<div");
    const parsed = parseAirbnbEmail(prepared.text, "div-only", {
      subject: prepared.subject,
      referenceDate: prepared.referenceDate,
    });
    expect(parsed.parseIncomplete).toBeUndefined();
    expect(parsed.airbnbBookingId).toBe("HMZB3YZBBA");
    expect(parsed.checkIn).toBe("2026-08-19");
    expect(parsed.checkOut).toBe("2026-08-21");
    expect(parsed.listingName).toBe("Rehaish Maple");
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

  it("does not treat guest notes or house-rule links as the listing name", () => {
    const body = `
Reservation confirmed - Guest arrives May 13
Confirmation code HMCYHQNP5W
Check-in
Wed, May 13
Checkout
Fri, May 22
https://www.airbnb.com/rooms/1676985216690195939
is suitable for children by  https://www.airbnb.com/hosting/listings/1676985216690195939/details/safety-info updating your House Rules.
from 13 May till 21 May, 22 May checkout.. We are four adults.
we will take care of it
`;
    const parsed = parseAirbnbEmail(body, "noisy-listing", {
      subject: "Reservation confirmed - Guest arrives May 13",
      referenceDate: new Date("2026-05-01T00:00:00.000Z"),
    });

    expect(parsed.airbnbBookingId).toBe("HMCYHQNP5W");
    expect(parsed.listingName).toBe("");
    expect(parsed.parseIssues?.some((issue) => issue.startsWith("listingName:"))).toBe(true);
  });

  it("parses full raw eml without pre-processing options", () => {
    const parsed = parseAirbnbEmail(readFixture("confirmed-manish-2026.eml"), "raw-eml");

    expect(parsed.airbnbBookingId).toBe("HM2SJPMSJS");
    expect(parsed.guestName).toBe("Manish Dahiya");
    expect(parsed.checkIn).toBe("2026-06-01");
  });
});
