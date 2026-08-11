import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAuthUrl } from "@/integrations/google/oauth";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";

  if (!user) {
    return NextResponse.redirect(new URL("/login", base));
  }

  const url = getGoogleAuthUrl({ userId: user.id, purpose: "gmail" });
  return NextResponse.redirect(url);
}
