import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { env } from "@/lib/env";

export type CurrentAdmin = {
  authUserId: string;
  email: string;
};

/**
 * Resolve the current platform admin, if any.
 *
 * A user is an admin when a row exists in `public.admins`. The very first admin
 * is bootstrapped from `ADMIN_BOOTSTRAP_EMAIL`: on their first authenticated
 * visit the row is created automatically (via the service role) so they can log
 * in and promote others without any manual DB step.
 */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: existing } = await service
    .from("admins")
    .select("auth_user_id, email")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existing) {
    return { authUserId: existing.auth_user_id, email: existing.email };
  }

  const bootstrapped = await maybeBootstrapAdmin(user);
  return bootstrapped;
}

async function maybeBootstrapAdmin(user: User): Promise<CurrentAdmin | null> {
  const bootstrapEmail = env.adminBootstrapEmail;
  const userEmail = (user.email ?? "").trim().toLowerCase();
  if (!bootstrapEmail || !userEmail || userEmail !== bootstrapEmail) {
    return null;
  }

  const service = createServiceClient();
  const { error } = await service.from("admins").insert({
    auth_user_id: user.id,
    email: userEmail,
  });
  // Ignore unique-violation races: a concurrent request may have inserted first.
  if (error && error.code !== "23505") {
    return null;
  }
  return { authUserId: user.id, email: userEmail };
}

/** Guard for admin server components / actions. Redirects non-admins away. */
export async function requireAdmin(): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/dashboard");
  }
  return admin;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const admin = await getCurrentAdmin();
  return admin !== null;
}
