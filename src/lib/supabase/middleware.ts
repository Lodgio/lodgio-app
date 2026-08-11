import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

/**
 * Lightweight admin check for the middleware barrier. This is a first line of
 * defense only; the authoritative check is requireAdmin() in the /admin layout.
 * Allows the bootstrap admin through even before their admins row exists.
 */
async function isAdminUser(user: User): Promise<boolean> {
  const email = (user.email ?? "").trim().toLowerCase();
  if (env.adminBootstrapEmail && email === env.adminBootstrapEmail) {
    return true;
  }
  const service = createClient<Database>(env.supabaseUrl(), env.supabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await service
    .from("admins")
    .select("auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return !!data;
}

/**
 * Host-level gate state for dashboard access. Returns null when the user is not
 * a host (e.g. an admin-only account), in which case no host gating applies.
 */
async function getHostGateState(
  user: User
): Promise<{ isDeactivated: boolean; welcomePending: boolean } | null> {
  const service = createClient<Database>(env.supabaseUrl(), env.supabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: host } = await service
    .from("hosts")
    .select("id, is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!host) return null;

  const { data: settings } = await service
    .from("host_settings")
    .select("whatsapp_verified_at, checkin_link_confirmed_at")
    .eq("host_id", host.id)
    .maybeSingle();

  return {
    isDeactivated: host.is_active === false,
    welcomePending:
      !settings || !settings.whatsapp_verified_at || !settings.checkin_link_confirmed_at,
  };
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.supabaseUrl(),
    env.supabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isHome = request.nextUrl.pathname === "/";
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");
  const isWelcome = request.nextUrl.pathname.startsWith("/welcome");
  const isAdmin = request.nextUrl.pathname.startsWith("/admin");
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");

  if ((isDashboard || isWelcome || isAdmin) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Mandatory post-registration welcome flow gates the dashboard.
  if (user && (isDashboard || isWelcome)) {
    const state = await getHostGateState(user);
    // Deactivated hosts are signed out and cannot use the app.
    if (state?.isDeactivated) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("deactivated", "1");
      return NextResponse.redirect(url);
    }
    if (state?.welcomePending && isDashboard) {
      const url = request.nextUrl.clone();
      url.pathname = "/welcome";
      return NextResponse.redirect(url);
    }
    if (state && !state.welcomePending && isWelcome) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Admin barrier: first layer on top of requireAdmin() in the /admin layout.
  if (user && isAdmin && !(await isAdminUser(user))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && (isHome || isAuthPage)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
