import { requireAdmin } from "@/lib/admin";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@/components/dashboard-shell";
import { createServiceClient } from "@/lib/supabase/service";
import { addAdmin, removeAdmin } from "@/app/(admin)/admin/actions";

const savedMessages: Record<string, string> = {
  added: "Admin added.",
  removed: "Admin removed.",
};

export default async function AdminAdminsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const admin = await requireAdmin();
  const sp = await searchParams;

  const service = createServiceClient();
  const { data: admins } = await service
    .from("admins")
    .select("auth_user_id, email, created_at")
    .order("created_at", { ascending: true });

  return (
    <AdminShell title="Admins" adminEmail={admin.email}>
      <div className="space-y-6">
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

        <Card title="Add admin">
          <form action={addAdmin} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1 text-sm">
              <span className="mb-1 block text-zinc-500">Email of an existing user</span>
              <input
                name="email"
                type="email"
                placeholder="person@example.com"
                className="field"
                required
              />
            </label>
            <button className="btn-primary">Add admin</button>
          </form>
          <p className="mt-2 text-xs text-zinc-500">
            The person must already have a Lodgio account. Adding them grants full admin access.
          </p>
        </Card>

        <Card title="Current admins">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-zinc-500">
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Added</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {(admins ?? []).map((a) => (
                  <tr key={a.auth_user_id} className="border-b border-zinc-100">
                    <td className="py-2 pr-4 font-medium">
                      {a.email}
                      {a.auth_user_id === admin.authUserId ? (
                        <span className="ml-2 text-xs text-zinc-400">(you)</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-4 text-zinc-500">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      {a.auth_user_id === admin.authUserId ? (
                        <span className="text-xs text-zinc-400">—</span>
                      ) : (
                        <form action={removeAdmin}>
                          <input type="hidden" name="auth_user_id" value={a.auth_user_id} />
                          <button className="text-sm text-red-600">Remove</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
