import { Card, StatusBadge } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import {
  updateHostProfile,
  updateHostSettings,
  revokeGmailConnection,
  createExportSheet,
  syncPendingSheetsExport,
  disableSheetsExport,
} from "@/app/(dashboard)/dashboard/actions";
import { isPhase12Demo } from "@/lib/demo";
import { isWhatsAppEnabled } from "@/lib/features";
import { SubmitButton } from "@/components/submit-button";
import { scopesIncludeDriveFile, spreadsheetUrl } from "@/services/sheets/sheets-links";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    gmail?: string;
    sheets?: string;
    url?: string;
    detail?: string;
    exported?: string;
  }>;
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

  const sheetsEnabled = Boolean(settings?.sheets_export_enabled);
  const sheetsNeedsReconnect = settings?.sheets_status === "needs_reconnect";
  const hasDriveScope = scopesIncludeDriveFile(gmail?.granted_scopes);
  const sheetId = settings?.sheets_spreadsheet_id ?? null;
  const openUrl = sheetId ? spreadsheetUrl(sheetId) : params.url ? decodeURIComponent(params.url) : null;
  const gmailActive = gmail?.status === "active";

  return (
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

        {params.sheets === "connected" ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Google Sheets export is enabled. Create a sheet below (or wait for the first completed
            booking to create one automatically).
          </div>
        ) : null}

        {params.sheets === "created" && openUrl ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Export sheet created
            {params.exported ? ` · ${params.exported} booking(s) exported` : ""}.{" "}
            <a href={openUrl} target="_blank" rel="noreferrer" className="font-medium underline">
              Open in Google Sheets
            </a>
          </div>
        ) : null}

        {params.sheets === "synced" ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Synced pending bookings to Google Sheets
            {params.exported !== undefined ? ` (${params.exported} new row(s))` : ""}.
          </div>
        ) : null}

        {params.sheets === "need_gmail" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Connect Gmail first — Sheets export uses the same Google account.
          </div>
        ) : null}

        {params.sheets === "error" ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Google Sheets setup failed
            {params.detail ? `: ${decodeURIComponent(params.detail)}` : ". Please try again."}
          </div>
        ) : null}

        <Card title="Profile">
          <form action={updateHostProfile} className="space-y-3">
            <input name="business_name" defaultValue={host?.business_name ?? ""} className="field" />
            <input name="phone" defaultValue={host?.phone ?? ""} placeholder="Host phone" className="field" />
            <SubmitButton className="btn-primary" pendingLabel="Saving…">
              Save profile
            </SubmitButton>
          </form>
        </Card>

        <Card title="Gmail">
          {gmail ? (
            <div className="space-y-2 text-sm">
              <div>{gmail.email_address}</div>
              <StatusBadge status={gmail.status} />
              {gmail.status === "needs_reconnect" ? (
                <a href="/api/auth/gmail" className="btn-primary mt-2 inline-block">
                  Reconnect Gmail
                </a>
              ) : null}
            </div>
          ) : (
            <a href="/api/auth/gmail" className="btn-primary inline-block">
              Connect Gmail
            </a>
          )}
          {gmail ? (
            <form action={revokeGmailConnection} className="mt-3">
              <SubmitButton className="btn-secondary" pendingLabel="Revoking…">
                Revoke connection
              </SubmitButton>
            </form>
          ) : null}
        </Card>

        {!phase12 ? (
          <>
            <Card title="Google Sheets export">
              <p className="mb-3 text-sm text-zinc-600">
                Lodgio can create a spreadsheet in your Google Drive and append each completed
                booking. No manual sharing needed.
              </p>

              {sheetsNeedsReconnect || (sheetsEnabled && !hasDriveScope) ? (
                <div className="mb-3 space-y-2">
                  <p className="text-sm text-amber-800">
                    Sheets access was revoked or is missing. Reconnect to resume export.
                  </p>
                  <a href="/api/auth/google/sheets" className="btn-primary inline-block">
                    Reconnect Google Sheets export
                  </a>
                </div>
              ) : null}

              {!sheetsEnabled && !sheetsNeedsReconnect ? (
                <div className="space-y-2">
                  {gmailActive ? (
                    <a href="/api/auth/google/sheets" className="btn-primary inline-block">
                      Enable Google Sheets export
                    </a>
                  ) : (
                    <p className="text-sm text-zinc-600">
                      Connect Gmail above first, then enable Sheets export.
                    </p>
                  )}
                </div>
              ) : null}

              {sheetsEnabled && hasDriveScope ? (
                <div className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status="active" />
                    <span>Export enabled</span>
                  </div>
                  {openUrl ? (
                    <>
                      <a
                        href={openUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-blue-600 underline"
                      >
                        Open in Google Sheets
                      </a>
                      <form action={syncPendingSheetsExport}>
                        <SubmitButton className="btn-secondary" pendingLabel="Syncing…">
                          Sync pending bookings to sheet
                        </SubmitButton>
                      </form>
                    </>
                  ) : (
                    <form action={createExportSheet}>
                      <SubmitButton className="btn-primary" pendingLabel="Creating sheet…">
                        Create export sheet
                      </SubmitButton>
                    </form>
                  )}
                  <form action={disableSheetsExport}>
                    <SubmitButton className="btn-secondary" pendingLabel="Disabling…">
                      Disable Sheets export
                    </SubmitButton>
                  </form>
                </div>
              ) : null}
            </Card>

            <Card title="Integrations">
              <form action={updateHostSettings} className="space-y-3">
                <select
                  name="default_language"
                  defaultValue={settings?.default_language ?? "en"}
                  className="field"
                >
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
                <SubmitButton className="btn-primary" pendingLabel="Saving…">
                  Save settings
                </SubmitButton>
              </form>
            </Card>
          </>
        ) : null}
      </div>
  );
}
