import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export const getCurrentHost = cache(async (): Promise<Tables<"hosts"> | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: host } = await supabase
    .from("hosts")
    .select("*")
    .eq("auth_user_id", userId)
    .single();

  return host;
});

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
