"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function updateHost(formData: FormData) {
  await requireAdmin();
  const hostId = str(formData, "host_id");
  if (!hostId) throw new Error("Missing host id");

  const service = createServiceClient();
  const { error } = await service
    .from("hosts")
    .update({
      business_name: str(formData, "business_name"),
      phone: str(formData, "phone"),
      slug: str(formData, "slug"),
    })
    .eq("id", hostId);

  if (error) {
    redirect(`/admin/hosts/${hostId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/admin/hosts/${hostId}`);
  revalidatePath("/admin");
  redirect(`/admin/hosts/${hostId}?saved=profile`);
}

export async function updateHostSettings(formData: FormData) {
  await requireAdmin();
  const hostId = str(formData, "host_id");
  if (!hostId) throw new Error("Missing host id");

  const service = createServiceClient();
  const { error } = await service
    .from("host_settings")
    .update({
      sms_fallback_enabled: formData.get("sms_fallback_enabled") === "on",
      sheets_export_enabled: formData.get("sheets_export_enabled") === "on",
      sheets_spreadsheet_id: str(formData, "sheets_spreadsheet_id") || null,
      default_language: (formData.get("default_language") as "en" | "hi") ?? "en",
    })
    .eq("host_id", hostId);

  if (error) {
    redirect(`/admin/hosts/${hostId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/admin/hosts/${hostId}`);
  redirect(`/admin/hosts/${hostId}?saved=settings`);
}

export async function setHostActive(formData: FormData) {
  await requireAdmin();
  const hostId = str(formData, "host_id");
  const active = str(formData, "active") === "true";
  if (!hostId) throw new Error("Missing host id");

  const service = createServiceClient();
  const { error } = await service
    .from("hosts")
    .update({
      is_active: active,
      deactivated_at: active ? null : new Date().toISOString(),
    })
    .eq("id", hostId);

  if (error) {
    redirect(`/admin/hosts/${hostId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/admin/hosts/${hostId}`);
  revalidatePath("/admin");
  redirect(`/admin/hosts/${hostId}?saved=${active ? "activated" : "deactivated"}`);
}

/**
 * Hard delete: removes the auth user, which cascades to the host row and all
 * of its data (settings, bookings, guests, etc.) via ON DELETE CASCADE.
 */
export async function deleteHost(formData: FormData) {
  await requireAdmin();
  const hostId = str(formData, "host_id");
  if (!hostId) throw new Error("Missing host id");

  const service = createServiceClient();
  const { data: host, error: findError } = await service
    .from("hosts")
    .select("auth_user_id")
    .eq("id", hostId)
    .maybeSingle();

  if (findError || !host) {
    redirect(`/admin?error=${encodeURIComponent(findError?.message ?? "Host not found")}`);
  }

  const { error: delError } = await service.auth.admin.deleteUser(host!.auth_user_id);
  if (delError) {
    redirect(`/admin/hosts/${hostId}?error=${encodeURIComponent(delError.message)}`);
  }

  revalidatePath("/admin");
  redirect("/admin?deleted=1");
}

export async function addAdmin(formData: FormData) {
  await requireAdmin();
  const email = str(formData, "email").toLowerCase();
  if (!email) redirect("/admin/admins?error=Email+required");

  const service = createServiceClient();
  const authUser = await findAuthUserByEmail(email);
  if (!authUser) {
    redirect(
      `/admin/admins?error=${encodeURIComponent(
        "No account found for that email. The user must sign up first."
      )}`
    );
  }

  const current = await requireAdmin();
  const { error } = await service.from("admins").insert({
    auth_user_id: authUser!.id,
    email,
    created_by: current.authUserId,
  });

  if (error && error.code !== "23505") {
    redirect(`/admin/admins?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/admins");
  redirect("/admin/admins?saved=added");
}

export async function removeAdmin(formData: FormData) {
  const current = await requireAdmin();
  const authUserId = str(formData, "auth_user_id");
  if (!authUserId) throw new Error("Missing admin id");

  if (authUserId === current.authUserId) {
    redirect("/admin/admins?error=You+cannot+remove+yourself");
  }

  const service = createServiceClient();
  const { error } = await service.from("admins").delete().eq("auth_user_id", authUserId);
  if (error) {
    redirect(`/admin/admins?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/admins");
  redirect("/admin/admins?saved=removed");
}

async function findAuthUserByEmail(email: string): Promise<{ id: string } | null> {
  const service = createServiceClient();
  const perPage = 200;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error || !data) return null;
    const match = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (match) return { id: match.id };
    if (data.users.length < perPage) break;
  }
  return null;
}
