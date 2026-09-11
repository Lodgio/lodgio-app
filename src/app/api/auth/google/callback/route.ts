import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  decodeOAuthState,
  DRIVE_FILE_SCOPE,
  exchangeGoogleCode,
  GMAIL_SCOPE,
  normalizeGrantedScopes,
} from "@/integrations/google/oauth";
import { encryptToken, decryptToken } from "@/lib/crypto/tokens";
import { isPhase12Demo } from "@/lib/demo";
import { createServiceClient } from "@/lib/supabase/service";

function mergeScopes(...parts: Array<string | null | undefined>): string {
  const all = parts
    .flatMap((p) => (p ?? "").split(/[\s,]+/))
    .map((s) => s.trim())
    .filter(Boolean);
  return normalizeGrantedScopes(all.join(" "));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const state = stateRaw ? decodeOAuthState(stateRaw) : null;

  if (error || !code || !state) {
    if (state?.purpose !== "sheets" && error === "access_denied") {
      return NextResponse.redirect(`${base}/dashboard/onboarding?step=1&gmail=denied`);
    }
    const dest =
      state?.purpose === "sheets"
        ? `${base}/dashboard/settings?sheets=error`
        : `${base}/dashboard/onboarding?step=1&error=${encodeURIComponent("Gmail connection failed")}`;
    return NextResponse.redirect(dest);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== state.userId) {
    return NextResponse.redirect(`${base}/login`);
  }

  const { data: host } = await supabase
    .from("hosts")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!host) {
    return NextResponse.redirect(
      state.purpose === "sheets"
        ? `${base}/dashboard/settings?sheets=error`
        : `${base}/dashboard/settings?gmail=error`
    );
  }

  try {
    const exchanged = await exchangeGoogleCode(code);
    const service = createServiceClient();

    const { data: existing } = await service
      .from("gmail_connections")
      .select("id, email_address, refresh_token, granted_scopes, sync_cursor")
      .eq("host_id", host.id)
      .maybeSingle();

    if (state.purpose === "gmail") {
      if (!exchanged.refreshToken) {
        throw new Error("No refresh token returned — revoke prior access and retry with consent");
      }
      const grantedScopes = mergeScopes(exchanged.grantedScopes, GMAIL_SCOPE);
      const firstConnectCursor = existing?.sync_cursor
        ? undefined
        : String(Math.floor(Date.now() / 1000));
      const { error: upsertError } = await service.from("gmail_connections").upsert(
        {
          host_id: host.id,
          email_address: exchanged.emailAddress,
          refresh_token: encryptToken(exchanged.refreshToken),
          status: "active",
          granted_scopes: grantedScopes,
          ...(firstConnectCursor ? { sync_cursor: firstConnectCursor } : {}),
        },
        { onConflict: "host_id,email_address" }
      );
      if (upsertError) {
        // Unique is (host_id, email_address); if email changed, update by host_id
        const { error: updateError } = await service
          .from("gmail_connections")
          .update({
            email_address: exchanged.emailAddress,
            refresh_token: encryptToken(exchanged.refreshToken),
            status: "active",
            granted_scopes: grantedScopes,
            ...(firstConnectCursor ? { sync_cursor: firstConnectCursor } : {}),
          })
          .eq("host_id", host.id);
        if (updateError) throw updateError;
      }

      await service
        .from("host_settings")
        .update({
          onboarding_step: 2,
          gmail_access_status: "connected",
          gmail_requested_email: exchanged.emailAddress,
          gmail_access_approved_at: new Date().toISOString(),
        })
        .eq("host_id", host.id);

      return NextResponse.redirect(
        `${base}/dashboard/onboarding?step=${isPhase12Demo() ? "1" : "2"}&gmail=connected`
      );
    }

    // purpose === sheets — incremental drive.file
    if (!existing) {
      return NextResponse.redirect(`${base}/dashboard/settings?sheets=need_gmail`);
    }

    const grantedScopes = mergeScopes(
      existing.granted_scopes,
      exchanged.grantedScopes,
      GMAIL_SCOPE,
      DRIVE_FILE_SCOPE
    );

    let refreshTokenEnc = existing.refresh_token;
    if (exchanged.refreshToken) {
      refreshTokenEnc = encryptToken(exchanged.refreshToken);
    }

    // Verify we can decrypt existing if no new refresh token
    if (!exchanged.refreshToken) {
      decryptToken(existing.refresh_token);
    }

    const { error: updateError } = await service
      .from("gmail_connections")
      .update({
        refresh_token: refreshTokenEnc,
        granted_scopes: grantedScopes,
        status: "active",
        ...(exchanged.emailAddress ? { email_address: exchanged.emailAddress } : {}),
      })
      .eq("host_id", host.id);

    if (updateError) throw updateError;

    await service
      .from("host_settings")
      .update({
        sheets_export_enabled: true,
        sheets_status: "active",
      })
      .eq("host_id", host.id);

    return NextResponse.redirect(`${base}/dashboard/settings?sheets=connected`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("google_oauth_failed", state.purpose, message);
    return NextResponse.redirect(
      state.purpose === "sheets"
        ? `${base}/dashboard/settings?sheets=error`
        : `${base}/dashboard/onboarding?step=1&error=${encodeURIComponent("Gmail connection failed")}`
    );
  }
}
