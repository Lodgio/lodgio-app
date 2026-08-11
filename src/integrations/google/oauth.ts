import { google } from "googleapis";
import { env } from "@/lib/env";

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export type GoogleOAuthPurpose = "gmail" | "sheets";

export type GoogleOAuthState = {
  userId: string;
  purpose: GoogleOAuthPurpose;
};

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    env.googleClientId(),
    env.googleClientSecret(),
    env.googleRedirectUri()
  );
}

export function encodeOAuthState(state: GoogleOAuthState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

export function decodeOAuthState(raw: string): GoogleOAuthState | null {
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as Partial<GoogleOAuthState>;
    if (parsed.userId && (parsed.purpose === "gmail" || parsed.purpose === "sheets")) {
      return { userId: parsed.userId, purpose: parsed.purpose };
    }
  } catch {
    // Legacy Gmail connects used state = user.id
  }
  if (raw && raw.length > 10) {
    return { userId: raw, purpose: "gmail" };
  }
  return null;
}

export function getGoogleAuthUrl(state: GoogleOAuthState): string {
  const client = createOAuth2Client();
  if (state.purpose === "sheets") {
    return client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: true,
      scope: [DRIVE_FILE_SCOPE],
      state: encodeOAuthState(state),
    });
  }
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GMAIL_SCOPE],
    state: encodeOAuthState(state),
  });
}

/** @deprecated Use getGoogleAuthUrl({ userId, purpose: "gmail" }) */
export function getGmailAuthUrl(userId: string): string {
  return getGoogleAuthUrl({ userId, purpose: "gmail" });
}

export function normalizeGrantedScopes(scopeString: string | null | undefined): string {
  if (!scopeString) return GMAIL_SCOPE;
  const parts = scopeString.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  return [...new Set(parts)].sort().join(" ");
}

export function scopesIncludeDriveFile(grantedScopes: string | null | undefined): boolean {
  if (!grantedScopes) return false;
  return grantedScopes.split(/[\s,]+/).includes(DRIVE_FILE_SCOPE);
}

export async function exchangeGoogleCode(code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Gmail connect only requests gmail.readonly — that is enough for users.getProfile,
  // but NOT for oauth2.userinfo (needs email/profile scopes). Prefer Gmail profile.
  let emailAddress = "";
  try {
    const gmail = google.gmail({ version: "v1", auth: client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    emailAddress = profile.data.emailAddress ?? "";
  } catch {
    try {
      const oauth2 = google.oauth2({ version: "v2", auth: client });
      const profile = await oauth2.userinfo.get();
      emailAddress = profile.data.email ?? "";
    } catch {
      // Sheets-only reconnect can keep the existing stored email.
    }
  }

  return {
    refreshToken: tokens.refresh_token ?? null,
    accessToken: tokens.access_token ?? null,
    emailAddress,
    grantedScopes: normalizeGrantedScopes(tokens.scope),
  };
}

/** @deprecated Use exchangeGoogleCode */
export async function exchangeGmailCode(code: string) {
  const result = await exchangeGoogleCode(code);
  if (!result.refreshToken) {
    throw new Error("No refresh token returned — revoke prior access and retry with consent");
  }
  return {
    refreshToken: result.refreshToken,
    emailAddress: result.emailAddress,
    grantedScopes: result.grantedScopes,
  };
}

export function createOAuthClientFromRefreshToken(refreshToken: string) {
  const client = createOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}
