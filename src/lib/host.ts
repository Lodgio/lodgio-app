import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export async function getCurrentHost(): Promise<Tables<"hosts"> | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: host } = await supabase
    .from("hosts")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  return host;
}

export async function getHostBySlug(slug: string): Promise<Tables<"hosts"> | null> {
  const { createServiceClient } = await import("@/lib/supabase/service");
  const supabase = createServiceClient();
  const { data: host } = await supabase
    .from("hosts")
    .select("*")
    .eq("slug", slug)
    .single();
  return host;
}

export async function hostHasActiveGmail(hostId: string): Promise<boolean> {
  const { createServiceClient } = await import("@/lib/supabase/service");
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("gmail_connections")
    .select("id")
    .eq("host_id", hostId)
    .eq("status", "active")
    .maybeSingle();
  return !!data;
}
