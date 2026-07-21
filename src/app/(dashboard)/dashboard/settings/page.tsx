import { DashboardShell, Card, StatusBadge } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { updateHostProfile, updateHostSettings, revokeGmailConnection } from "@/app/(dashboard)/dashboard/actions";
import { env } from "@/lib/env";
import { isPhase12Demo } from "@/lib/demo";
import { isWhatsAppEnabled } from "@/lib/features";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string }>;
}) {
  const params = await searchParams;
  const phase12 = isPhase12Demo();
  const whatsappEnabled = isWhatsAppEnabled();
  const supabase = await createClient();
  const [{ data: host }, { data: settings }, { data: gmail }] = await Promise.all([
    supabase.from("hosts").select("*").single(),
    supabase.from("host_settings").select("*").single(),
    supabase.from("gmail_connections").select("*").maybeSingle(),
  ]);

  return (
    <DashboardShell title="Settings">
      <div className="space-y-6">
        {params.gmail === "error" ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Gmail connection failed. Please try again.
          </div>
        ) : null}

        {params.gmail === "needed" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Connect Gmail before running sync.
          </div>
        ) : null}

        <Card title="Profile">
          <form action={updateHostProfile} className="space-y-3">
            <input name="business_name" defaultValue={host?.business_name ?? ""} className="field" />
            <input name="phone" defaultValue={host?.phone ?? ""} placeholder="Host phone" className="field" />
            <button className="btn-primary">Save profile</button>
          </form>
        </Card>

        <Card title="Gmail">
          {gmail ? (
            <div className="space-y-2 text-sm">
              <div>{gmail.email_address}</div>
              <StatusBadge status={gmail.status} />
              {gmail.status === "needs_reconnect" ? (
                <a href="/api/auth/gmail" className="btn-primary mt-2 inline-block">Reconnect Gmail</a>
              ) : null}
            </div>
          ) : (
            <a href="/api/auth/gmail" className="btn-primary inline-block">Connect Gmail</a>
          )}
          {gmail ? (
            <form action={revokeGmailConnection} className="mt-3">
              <button className="btn-secondary">Revoke connection</button>
            </form>
          ) : null}
        </Card>

        {!phase12 ? (
        <Card title="Integrations">
          <form action={updateHostSettings} className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="sms_fallback_enabled" defaultChecked={settings?.sms_fallback_enabled} />
              SMS fallback enabled
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="sheets_export_enabled" defaultChecked={settings?.sheets_export_enabled} />
              Sheets export enabled
            </label>
            <input
              name="sheets_spreadsheet_id"
              defaultValue={settings?.sheets_spreadsheet_id ?? ""}
              placeholder="Google Sheets spreadsheet ID"
              className="field"
            />
            <select name="default_language" defaultValue={settings?.default_language ?? "en"} className="field">
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
            {whatsappEnabled ? (
              <>
                <input
                  name="whatsapp_phone_number_id"
                  defaultValue={settings?.whatsapp_phone_number_id ?? ""}
                  placeholder="WhatsApp Phone Number ID"
                  className="field"
                />
                <input
                  name="whatsapp_waba_id"
                  defaultValue={settings?.whatsapp_waba_id ?? ""}
                  placeholder="WhatsApp WABA ID"
                  className="field"
                />
              </>
            ) : null}
            <button className="btn-primary">Save settings</button>
          </form>
          <p className="mt-3 text-xs text-zinc-500">
            Mock mode: SMS={env.useMockSms ? "on" : "off"}
          </p>
        </Card>
        ) : null}
      </div>
    </DashboardShell>
  );
}
