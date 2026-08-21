import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAuthUrl } from "@/integrations/google/oauth";
import { canStartGmailOAuth } from "@/lib/gmail-access";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";

  if (!user) {
    return NextResponse.redirect(new URL("/login", base));
  }

  const { data: host } = await supabase
    .from("hosts")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!host) {
    return NextResponse.redirect(new URL("/login", base));
  }

  const [{ data: settings }, { data: connection }] = await Promise.all([
    supabase
      .from("host_settings")
      .select("gmail_access_status")
      .eq("host_id", host.id)
      .maybeSingle(),
    supabase
      .from("gmail_connections")
      .select("status")
      .eq("host_id", host.id)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  if (
    !canStartGmailOAuth(settings?.gmail_access_status, connection?.status === "active")
  ) {
    return NextResponse.redirect(`${base}/dashboard/onboarding?step=1`);
  }

  const url = getGoogleAuthUrl({ userId: user.id, purpose: "gmail" });
  return NextResponse.redirect(url);
}
