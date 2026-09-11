import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@/components/dashboard-shell";
import { createServiceClient } from "@/lib/supabase/service";

function tone(severity: string) {
  if (severity === "critical") return "bg-red-50 text-red-800 border-red-200";
  if (severity === "warning") return "bg-amber-50 text-amber-900 border-amber-200";
  return "bg-zinc-50 text-zinc-700 border-zinc-200";
}

export default async function AdminOpsPage() {
  const admin = await requireAdmin();
  const service = createServiceClient();

  const [{ data: events, error: eventsError }, { data: messages }, { data: hosts }] = await Promise.all([
    service.from("ops_events").select("*").order("created_at", { ascending: false }).limit(80),
    service
      .from("message_log")
      .select("id, host_id, booking_id, recipient_type, template_kind, to_number, status, error, created_at, wamid")
      .order("created_at", { ascending: false })
      .limit(50),
    service.from("hosts").select("id, business_name, slug"),
  ]);

  const hostMap = new Map((hosts ?? []).map((h) => [h.id, h]));
  const hostName = (id: string | null) => {
    if (!id) return "—";
    const host = hostMap.get(id);
    return host?.business_name || host?.slug || id.slice(0, 8);
  };

  return (
    <AdminShell title="Activity" adminEmail={admin.email}>
      <div className="space-y-6">
        <Card title="Problems">
          <p className="mb-3 text-sm text-zinc-600">
            WhatsApp failures, Gmail disconnects, and emails we could not parse. Critical items can
            also email {process.env.OPS_ALERT_EMAIL || process.env.ADMIN_BOOTSTRAP_EMAIL || "the ops address"} when Resend is set.
          </p>
          {eventsError ? (
            <p className="text-sm text-amber-800">
              Activity table is not on this database yet. Apply the ops_events migration.
            </p>
          ) : (events ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500">No events yet.</p>
          ) : (
            <ul className="space-y-2">
              {(events ?? []).map((event) => (
                <li
                  key={event.id}
                  className={`rounded-md border px-3 py-2 text-sm ${tone(event.severity)}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">{event.title}</p>
                    <p className="text-xs opacity-80">
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-1 text-xs">
                    {hostName(event.host_id)}
                    {event.host_id ? (
                      <>
                        {" · "}
                        <Link href={`/admin/hosts/${event.host_id}`} className="underline">
                          Open host
                        </Link>
                      </>
                    ) : null}
                  </p>
                  {event.detail ? <p className="mt-1">{event.detail}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="WhatsApp log">
          <p className="mb-3 text-sm text-zinc-600">
            What we sent, whether Meta accepted it, and later delivery status from the webhook.
          </p>
          {(messages ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500">No WhatsApp sends yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-zinc-500">
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Host</th>
                    <th className="py-2 pr-4">To</th>
                    <th className="py-2 pr-4">Template</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {(messages ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-zinc-100 align-top">
                      <td className="py-2 pr-4 whitespace-nowrap text-zinc-500">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4">
                        <Link href={`/admin/hosts/${row.host_id}`} className="text-blue-600">
                          {hostName(row.host_id)}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">
                        {row.recipient_type}
                        <div className="text-xs text-zinc-500">{row.to_number}</div>
                      </td>
                      <td className="py-2 pr-4">{row.template_kind ?? "—"}</td>
                      <td className="py-2 pr-4 font-medium">{row.status}</td>
                      <td className="py-2 text-xs text-red-700">{row.error ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
