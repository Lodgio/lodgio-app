import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken } from "@/lib/crypto/tokens";
import { googleErrorCode } from "@/integrations/google/token-errors";

/**
 * Ask Google to invalidate a refresh token.
 * Failures are logged without the token. Callers still delete the local copy.
 */
export async function revokeRefreshTokenAtGoogle(refreshToken: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
    });
  } catch {
    console.error("google_token_revoke_failed", "network");
    return;
  }

  if (response.ok) return;

  let errorCode = `http_${response.status}`;
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error.length < 80) {
      errorCode = body.error;
    }
  } catch {
    // Ignore a non-JSON body. It can echo the token.
  }
  console.error("google_token_revoke_failed", response.status, errorCode);
}

/**
 * Revoke every stored Google refresh token for this host, then wipe them.
 * Sheets export uses the same token, so it is turned off as well.
 * The connection row stays, with status revoked and refresh_token null.
 */
export async function disconnectHostGoogle(hostId: string): Promise<void> {
  const supabase = createServiceClient();
  const { data: connections } = await supabase
    .from("gmail_connections")
    .select("id, refresh_token")
    .eq("host_id", hostId);

  for (const connection of connections ?? []) {
    if (!connection.refresh_token) continue;
    try {
      const refreshToken = decryptToken(connection.refresh_token);
      await revokeRefreshTokenAtGoogle(refreshToken);
    } catch (error) {
      console.error("google_token_revoke_failed", googleErrorCode(error));
    }
  }

  const { error: clearError } = await supabase
    .from("gmail_connections")
    .update({
      refresh_token: null,
      status: "revoked",
    })
    .eq("host_id", hostId);

  if (clearError) {
    // 23502: column is still NOT NULL. Drop the row so the token is not kept.
    if (clearError.code === "23502") {
      const { error: deleteError } = await supabase
        .from("gmail_connections")
        .delete()
        .eq("host_id", hostId);
      if (deleteError) {
        console.error("google_token_clear_failed", deleteError.code ?? "delete_failed");
        throw new Error("Could not clear the stored Google token");
      }
    } else {
      console.error("google_token_clear_failed", clearError.code ?? "update_failed");
      throw new Error("Could not clear the stored Google token");
    }
  }

  await supabase
    .from("host_settings")
    .update({
      sheets_export_enabled: false,
      sheets_status: "disabled",
      gmail_access_status: "none",
    })
    .eq("host_id", hostId);
}
