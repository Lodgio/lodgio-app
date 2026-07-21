import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGmailAuthUrl } from "@/integrations/gmail/oauth";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.APP_BASE_URL ?? "http://localhost:3000"));
  }

  const url = getGmailAuthUrl(user.id);
  return NextResponse.redirect(url);
}
