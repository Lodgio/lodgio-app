import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAuthUrl } from "@/integrations/google/oauth";

/** Incremental OAuth for drive.file (Sheets export). Requires an existing Gmail Google link. */
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
    return NextResponse.redirect(`${base}/dashboard/settings?sheets=error`);
  }

  const { data: gmail } = await supabase
    .from("gmail_connections")
    .select("id, status")
    .eq("host_id", host.id)
    .eq("status", "active")
    .maybeSingle();

  if (!gmail) {
    return NextResponse.redirect(`${base}/dashboard/settings?sheets=need_gmail`);
  }

  const url = getGoogleAuthUrl({ userId: user.id, purpose: "sheets" });
  return NextResponse.redirect(url);
}
