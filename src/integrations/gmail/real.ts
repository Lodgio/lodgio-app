import { google } from "googleapis";
import type { Cursor, GmailClient, HostConnection, RawEmail } from "@/integrations/types";
import { IntegrationError } from "@/integrations/types";
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

        const body = extractBody(full.data as Parameters<typeof extractBody>[0]);
        const receivedAt = full.data.internalDate
          ? new Date(parseInt(full.data.internalDate, 10)).toISOString()
          : new Date().toISOString();

        emails.push({
          id: msg.id,
          threadId: msg.threadId ?? msg.id,
          snippet: full.data.snippet ?? "",
          body,
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

function extractBody(message: {
  payload?: {
    parts?: Array<{ mimeType?: string | null; body?: { data?: string | null } | null }> | null;
    body?: { data?: string | null } | null;
    mimeType?: string | null;
  } | null;
}): string {
  const parts = message.payload?.parts ?? [];
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return Buffer.from(part.body.data, "base64").toString("utf8");
    }
    if (part.mimeType === "text/html" && part.body?.data) {
      return Buffer.from(part.body.data, "base64").toString("utf8");
    }
  }
  if (message.payload?.body?.data) {
    return Buffer.from(message.payload.body.data, "base64").toString("utf8");
  }
  return "";
}
