import { getGmailAuthUrl, getGoogleAuthUrl } from "@/integrations/google/oauth";

// Re-export so existing gmail imports keep working.
export {
  createOAuth2Client,
  createOAuthClientFromRefreshToken,
  decodeOAuthState,
  DRIVE_FILE_SCOPE,
  encodeOAuthState,
  exchangeGmailCode,
  exchangeGoogleCode,
  GMAIL_SCOPE,
  getGmailAuthUrl,
  getGoogleAuthUrl,
  normalizeGrantedScopes,
  scopesIncludeDriveFile,
  type GoogleOAuthPurpose,
  type GoogleOAuthState,
} from "@/integrations/google/oauth";
