import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@/components/dashboard-shell";
import { createServiceClient } from "@/lib/supabase/service";

export default async function AdminHostsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;

  const service = createServiceClient();
  const { data: hosts } = await service
    .from("hosts")
    .select("id, business_name, slug, phone, is_active, created_at")
    .order("created_at", { ascending: false });

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
