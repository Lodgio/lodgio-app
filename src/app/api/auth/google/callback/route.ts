import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeGmailCode } from "@/integrations/gmail/oauth";
import { encryptToken } from "@/lib/crypto/tokens";
import { isPhase12Demo } from "@/lib/demo";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";

  if (error || !code || !state) {
    return NextResponse.redirect(`${base}/dashboard/settings?gmail=error`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== state) {
    return NextResponse.redirect(`${base}/login`);
  }

  const { data: host } = await supabase
    .from("hosts")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!host) {
    return NextResponse.redirect(`${base}/dashboard/settings?gmail=error`);
  }

  try {
    const { refreshToken, emailAddress } = await exchangeGmailCode(code);
    const { error } = await supabase.from("gmail_connections").upsert(
      {
        host_id: host.id,
        email_address: emailAddress,
        refresh_token: encryptToken(refreshToken),
        status: "active",
      },
      { onConflict: "host_id,email_address" }
    );
    if (error) {
      console.error("gmail_connection_upsert_failed", error.message);
      throw error;
    }

    const { error: settingsError } = await supabase
      .from("host_settings")
      .update({ onboarding_step: 2 })
      .eq("host_id", host.id);
    if (settingsError) {
      console.error("gmail_onboarding_step_update_failed", settingsError.message);
    }

    return NextResponse.redirect(
      `${base}/dashboard/onboarding?step=${isPhase12Demo() ? "1" : "2"}&gmail=connected`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("gmail_connection_failed", message);
    return NextResponse.redirect(`${base}/dashboard/settings?gmail=error`);
  }
}
