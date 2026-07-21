import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@/components/dashboard-shell";
import { createServiceClient } from "@/lib/supabase/service";
import {
  updateHost,
  updateHostSettings,
  setHostActive,
  deleteHost,
} from "@/app/(admin)/admin/actions";

const savedMessages: Record<string, string> = {
  profile: "Profile updated.",
  settings: "Settings updated.",
  activated: "Host activated.",
  deactivated: "Host deactivated.",
};

export default async function AdminHostDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ hostId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const admin = await requireAdmin();
  const { hostId } = await params;
  const sp = await searchParams;

  const service = createServiceClient();
  const [{ data: host }, { data: settings }, { data: gmail }, { count: bookingCount }] =
    await Promise.all([
      service.from("hosts").select("*").eq("id", hostId).maybeSingle(),
      service.from("host_settings").select("*").eq("host_id", hostId).maybeSingle(),
      service
        .from("gmail_connections")
        .select("email_address, status, last_synced_at")
        .eq("host_id", hostId)
        .maybeSingle(),
      service
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("host_id", hostId),
    ]);

  if (!host) notFound();

  return (
    <AdminShell title={host.business_name || host.slug} adminEmail={admin.email}>
      <div className="space-y-6">
        <Link href="/admin" className="inline-block text-sm text-blue-600">
          ← All hosts
        </Link>

        {sp.error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {decodeURIComponent(sp.error)}
          </p>
        ) : null}
        {sp.saved && savedMessages[sp.saved] ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {savedMessages[sp.saved]}
          </p>
        ) : null}

        <Card title="Overview">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-zinc-500">Status</dt>
              <dd className="font-medium">{host.is_active ? "Active" : "Deactivated"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Bookings</dt>
              <dd className="font-medium">{bookingCount ?? 0}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Gmail</dt>
              <dd className="font-medium">
                {gmail ? `${gmail.email_address} (${gmail.status})` : "Not connected"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Joined</dt>
              <dd className="font-medium">{new Date(host.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Onboarding step</dt>
              <dd className="font-medium">{settings?.onboarding_step ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Profile">
          <form action={updateHost} className="space-y-3">
            <input type="hidden" name="host_id" value={host.id} />
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-500">Business name</span>
              <input name="business_name" defaultValue={host.business_name} className="field" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-500">Slug</span>
              <input name="slug" defaultValue={host.slug} className="field" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-500">Phone</span>
              <input name="phone" defaultValue={host.phone} className="field" />
            </label>
            <button className="btn-primary">Save profile</button>
          </form>
        </Card>

        {settings ? (
          <Card title="Settings">
            <form action={updateHostSettings} className="space-y-3">
              <input type="hidden" name="host_id" value={host.id} />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="sms_fallback_enabled"
                  defaultChecked={settings.sms_fallback_enabled}
                />
                SMS fallback enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="sheets_export_enabled"
                  defaultChecked={settings.sheets_export_enabled}
                />
                Sheets export enabled
              </label>
              <input
                name="sheets_spreadsheet_id"
                defaultValue={settings.sheets_spreadsheet_id ?? ""}
                placeholder="Google Sheets spreadsheet ID"
                className="field"
              />
              <select
                name="default_language"
                defaultValue={settings.default_language}
                className="field"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
              <button className="btn-primary">Save settings</button>
            </form>
          </Card>
        ) : null}

        <Card title="Danger zone">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">
                  {host.is_active ? "Deactivate host" : "Reactivate host"}
                </p>
                <p className="text-sm text-zinc-500">
                  {host.is_active
                    ? "Signs the host out and blocks dashboard access. Data is kept."
                    : "Restores dashboard access for this host."}
                </p>
              </div>
              <form action={setHostActive}>
                <input type="hidden" name="host_id" value={host.id} />
                <input type="hidden" name="active" value={host.is_active ? "false" : "true"} />
                <button className="btn-secondary">
                  {host.is_active ? "Deactivate" : "Reactivate"}
                </button>
              </form>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-4">
              <div>
                <p className="text-sm font-medium text-red-700">Delete host permanently</p>
                <p className="text-sm text-zinc-500">
                  Removes the account and all data (bookings, guests, settings). Cannot be undone.
                </p>
              </div>
              <form action={deleteHost}>
                <input type="hidden" name="host_id" value={host.id} />
                <button className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                  Delete
                </button>
              </form>
            </div>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
