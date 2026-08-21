import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@/components/dashboard-shell";
import { createServiceClient } from "@/lib/supabase/service";
import { approveGmailAccess } from "@/app/(admin)/admin/actions";
import { SubmitButton } from "@/components/submit-button";

export default async function AdminHostsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string; saved?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;

  const service = createServiceClient();
  const [{ data: hosts }, { data: pendingSettings }] = await Promise.all([
    service
      .from("hosts")
      .select("id, business_name, slug, phone, is_active, created_at")
      .order("created_at", { ascending: false }),
    service
      .from("host_settings")
      .select("host_id, gmail_requested_email, gmail_access_requested_at")
      .eq("gmail_access_status", "pending_review")
      .order("gmail_access_requested_at", { ascending: true }),
  ]);

  const pendingHostIds = [...new Set((pendingSettings ?? []).map((row) => row.host_id))];
  const { data: pendingHosts } = pendingHostIds.length
    ? await service.from("hosts").select("id, business_name, slug").in("id", pendingHostIds)
    : { data: [] as Array<{ id: string; business_name: string; slug: string }> };
  const pendingHostMap = new Map((pendingHosts ?? []).map((h) => [h.id, h]));

  const total = hosts?.length ?? 0;
  const activeCount = (hosts ?? []).filter((h) => h.is_active).length;

  return (
    <AdminShell title="Hosts" adminEmail={admin.email}>
      <div className="space-y-6">
        {params.error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {decodeURIComponent(params.error)}
          </p>
        ) : null}
        {params.deleted ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Host deleted.
          </p>
        ) : null}
        {params.saved === "gmail" ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Gmail access approved. The host can connect now.
          </p>
        ) : null}

        <Card>
          <div className="mb-3">
            <h2 className="text-base font-semibold">Gmail access requests</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Add the address in Google Cloud → OAuth consent screen → Test users, then approve
              here.
            </p>
          </div>
          {(pendingSettings ?? []).length === 0 ? (
            <p className="text-sm text-zinc-600">No hosts are waiting for Gmail allowlist.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-zinc-500">
                    <th className="py-2 pr-4">Host</th>
                    <th className="py-2 pr-4">Requested Gmail</th>
                    <th className="py-2 pr-4">Requested</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {(pendingSettings ?? []).map((row) => {
                    const pendingHost = pendingHostMap.get(row.host_id);
                    return (
                      <tr key={row.host_id} className="border-b border-zinc-100">
                        <td className="py-2 pr-4">
                          <Link href={`/admin/hosts/${row.host_id}`} className="font-medium text-blue-600">
                            {pendingHost?.business_name || pendingHost?.slug || "Host"}
                          </Link>
                        </td>
                        <td className="py-2 pr-4 font-medium">{row.gmail_requested_email}</td>
                        <td className="py-2 pr-4 text-zinc-500">
                          {row.gmail_access_requested_at
                            ? new Date(row.gmail_access_requested_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="py-2">
                          <form action={approveGmailAccess}>
                            <input type="hidden" name="host_id" value={row.host_id} />
                            <SubmitButton className="btn-primary text-xs" pendingLabel="Approving…">
                              Approve
                            </SubmitButton>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Registered hosts</h2>
            <span className="text-sm text-zinc-500">
              {activeCount} active / {total} total
            </span>
          </div>
          {total === 0 ? (
            <p className="text-sm text-zinc-600">No hosts have registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-zinc-500">
                    <th className="py-2 pr-4">Business</th>
                    <th className="py-2 pr-4">Slug</th>
                    <th className="py-2 pr-4">Phone</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Joined</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {(hosts ?? []).map((h) => (
                    <tr key={h.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-4 font-medium">{h.business_name || "—"}</td>
                      <td className="py-2 pr-4 text-zinc-600">{h.slug}</td>
                      <td className="py-2 pr-4 text-zinc-600">{h.phone || "—"}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            h.is_active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-zinc-200 text-zinc-600"
                          }`}
                        >
                          {h.is_active ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-zinc-500">
                        {new Date(h.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2">
                        <Link
                          href={`/admin/hosts/${h.id}`}
                          className="text-sm text-blue-600"
                        >
                          Manage
                        </Link>
                      </td>
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
