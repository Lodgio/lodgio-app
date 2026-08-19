import { google } from "googleapis";
import type { Cursor, GmailClient, HostConnection, RawEmail } from "@/integrations/types";
import { IntegrationError } from "@/integrations/types";
import { extractGmailApiBody, gmailHeader, type GmailApiPart } from "@/integrations/gmail/email-utils";
import { env } from "@/lib/env";

const AIRBNB_QUERY = 'subject:"Reservation confirmed"';

export class RealGmailClient implements GmailClient {
  async listAirbnbMessages(
    host: HostConnection,
    since: Cursor
  ): Promise<{ emails: RawEmail[]; nextCursor: Cursor }> {
    if (!host.refreshToken) {
      throw new IntegrationError("Missing Gmail refresh token", "auth");
    }

    const oauth2 = new google.auth.OAuth2(
      env.googleClientId(),
      env.googleClientSecret(),
      env.googleRedirectUri()
    );
    oauth2.setCredentials({ refresh_token: host.refreshToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2 });

    try {
      const afterClause = since.value ? ` after:${since.value}` : "";
      const list = await gmail.users.messages.list({
        userId: "me",
        q: `${AIRBNB_QUERY}${afterClause}`,
        maxResults: 20,
      });

      const messages = list.data.messages ?? [];
      const emails: RawEmail[] = [];

      for (const msg of messages) {
        if (!msg.id) continue;
        const full = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "full",
        });

        const payload = full.data.payload as GmailApiPart | undefined;
        const body = extractGmailApiBody({ payload });
        const subject = gmailHeader(payload?.headers, "Subject");
        const receivedAt = full.data.internalDate
          ? new Date(parseInt(full.data.internalDate, 10)).toISOString()
          : new Date().toISOString();

        emails.push({
          id: msg.id,
          threadId: msg.threadId ?? msg.id,
          snippet: full.data.snippet ?? "",
          body,
          subject,
          receivedAt,
        });
      }

      const latestTimestamp =
        emails.length > 0
          ? Math.floor(new Date(emails[emails.length - 1].receivedAt).getTime() / 1000)
          : since.value;

      return {
        emails,
        nextCursor: { value: latestTimestamp ? String(latestTimestamp) : since.value },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("invalid_grant")) {
        throw new IntegrationError("Gmail token expired", "auth", error);
      }
      throw new IntegrationError(`Gmail API error: ${message}`, "transient", error);
    }
  }
}
