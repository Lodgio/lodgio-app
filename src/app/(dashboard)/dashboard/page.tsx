import { DashboardShell, Card, StatusBadge } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHost } from "@/lib/host";
import { syncGmailNow } from "@/app/(dashboard)/dashboard/actions";
import { isPhase12Demo } from "@/lib/demo";
import { getHostSetupWarnings } from "@/services/booking/property-booking-service";
import Link from "next/link";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sync_error?: string }>;
}) {
  const params = await searchParams;
  const phase12 = isPhase12Demo();
  const host = await getCurrentHost();
  const supabase = await createClient();
  const setupWarnings = host && !phase12 ? await getHostSetupWarnings(host.id) : [];

  const [
    { count: awaitingCount },
    { count: failedCount },
    { count: unmatchedCount },
    { count: bookingCount },
    { data: recentBookings },
    { data: gmail },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "awaiting_guest_form"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "failed"),
    supabase
      .from("form_submissions")
      .select("*", { count: "exact", head: true })
      .eq("matched", false),
    supabase.from("bookings").select("*", { count: "exact", head: true }),
    supabase
      .from("bookings")
      .select(
        "id, airbnb_booking_id, status, check_in, check_out, amount_paid_by_guest, amount_payable_to_host"
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("gmail_connections").select("status, email_address, last_synced_at").maybeSingle(),
  ]);

  const warnings: string[] = [];

  if (phase12) {
    if (gmail?.status === "needs_reconnect") {
      warnings.push("Gmail token expired — use Reconnect Gmail above, then sync again");
    } else if (!gmail || gmail.status !== "active") {
      warnings.push("Connect Gmail to import Airbnb confirmation emails");
    } else if ((failedCount ?? 0) > 0) {
      warnings.push(`${failedCount} failed bookings`);
    }
  } else {
    if ((awaitingCount ?? 0) > 0) {
      warnings.push(`${awaitingCount} bookings awaiting guest form`);
    }
    if ((unmatchedCount ?? 0) > 0) {
      warnings.push(`${unmatchedCount} unmatched form submissions`);
    }
    if ((failedCount ?? 0) > 0) warnings.push(`${failedCount} failed bookings`);
    if (gmail?.status === "needs_reconnect") warnings.push("Gmail needs reconnect");
    else if (!gmail || gmail.status !== "active") {
      warnings.push("Gmail not connected — connect to ingest Airbnb emails");
    }
    warnings.push(...setupWarnings);
  }

  const phase12Ok =
    phase12 &&
    gmail?.status === "active" &&
    warnings.length === 0 &&
    (bookingCount ?? 0) > 0;

  const phase12ReadyEmpty =
    phase12 && gmail?.status === "active" && warnings.length === 0 && (bookingCount ?? 0) === 0;

  return (
    <DashboardShell title="Overview">
      <div className="space-y-6">
        {params.sync_error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Gmail sync failed: {decodeURIComponent(params.sync_error)}
          </p>
        ) : null}

        <Card title="Gmail connection">
          {gmail?.status === "active" ? (
            <div className="space-y-2 text-sm">
              <p>
                Connected as <strong>{gmail.email_address}</strong>
              </p>
              <StatusBadge status={gmail.status} />
              {gmail.last_synced_at ? (
                <p className="text-zinc-500">
                  Last synced: {new Date(gmail.last_synced_at).toLocaleString()}
                </p>
              ) : (
                <p className="text-zinc-500">Not synced yet — run a manual sync below.</p>
              )}
              {phase12 ? (
                <form action={syncGmailNow} className="pt-2">
                  <button type="submit" className="btn-primary">
                    Sync Gmail now
                  </button>
                </form>
              ) : null}
            </div>
          ) : gmail?.status === "needs_reconnect" ? (
            <div className="space-y-2 text-sm">
              <p className="text-red-700">Your Gmail token expired. Reconnect to resume parsing.</p>
              <a href="/api/auth/gmail" className="btn-primary inline-block">
                Reconnect Gmail
              </a>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="text-zinc-600">
                Connect the inbox that receives Airbnb confirmation emails.
              </p>
              <a href="/api/auth/gmail" className="btn-primary inline-block">
                Connect Gmail
              </a>
            </div>
          )}
        </Card>

        <Card title="Status">
          {phase12Ok ? (
            <p className="text-sm text-emerald-700">
              {bookingCount} booking{bookingCount === 1 ? "" : "s"} parsed from Gmail — open
              Bookings for details.
            </p>
          ) : phase12ReadyEmpty ? (
            <p className="text-sm text-emerald-700">
              Gmail connected — run Sync Gmail now to import confirmation emails.
            </p>
          ) : warnings.length === 0 ? (
            <p className="text-sm text-emerald-700">Everything looks good.</p>
          ) : (
            <ul className="space-y-2 text-sm text-amber-800">
              {warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          )}
        </Card>

        {!phase12 ? (
          <Card title="Guest check-in link">
            <p className="mb-2 text-sm text-zinc-600">
              Paste this into your Airbnb scheduled message:
            </p>
            <code className="block rounded-md bg-zinc-100 p-3 text-sm break-all">
              {process.env.APP_BASE_URL ?? "http://localhost:3000"}/{host?.slug}/checkin
            </code>
          </Card>
        ) : null}

        <Card title="Recent bookings">
          {(recentBookings ?? []).length === 0 ? (
            <p className="text-sm text-zinc-600">
              No bookings yet. After Gmail is connected, run sync — confirmation emails will appear
              here with dates and financials.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-zinc-500">
                    <th className="py-2 pr-4">Booking ID</th>
                    <th className="py-2 pr-4">Dates</th>
                    {phase12 ? <th className="py-2 pr-4">Financials</th> : null}
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentBookings ?? []).map((b) => (
                    <tr key={b.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-4 font-medium">{b.airbnb_booking_id}</td>
                      <td className="py-2 pr-4">
                        {b.check_in} → {b.check_out}
                      </td>
                      {phase12 ? (
                        <td className="py-2 pr-4 text-zinc-600">
                          Paid {b.amount_paid_by_guest ?? "—"} / Host{" "}
                          {b.amount_payable_to_host ?? "—"}
                        </td>
                      ) : null}
                      <td className="py-2">
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link href="/dashboard/bookings" className="mt-4 inline-block text-sm text-blue-600">
            View all bookings
          </Link>
        </Card>
      </div>
    </DashboardShell>
  );
}
