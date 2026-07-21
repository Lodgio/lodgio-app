import { google } from "googleapis";
import { env } from "@/lib/env";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    env.googleClientId(),
    env.googleClientSecret(),
    env.googleRedirectUri()
  );
}

export function getGmailAuthUrl(state: string): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function exchangeGmailCode(code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("No refresh token returned — revoke prior access and retry with consent");
  }
  client.setCredentials(tokens);

  const gmail = google.gmail({ version: "v1", auth: client });
  const profile = await gmail.users.getProfile({ userId: "me" });

  return {
    refreshToken: tokens.refresh_token,
    emailAddress: profile.data.emailAddress ?? "",
  };
}
