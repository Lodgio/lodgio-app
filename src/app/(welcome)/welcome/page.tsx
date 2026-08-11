import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHost } from "@/lib/host";

export default async function WelcomeIndexPage() {
  const host = await getCurrentHost();
  if (!host) redirect("/login");

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("host_settings")
    .select("whatsapp_verified_at")
    .eq("host_id", host.id)
    .maybeSingle();

  redirect(settings?.whatsapp_verified_at ? "/welcome/step-2" : "/welcome/step-1");
}
