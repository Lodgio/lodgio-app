import { DashboardShell, Card } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { assertFullModeRoute } from "@/lib/demo";

export default async function SubmissionsPage() {
  assertFullModeRoute();
  const supabase = await createClient();
  const { data: submissions } = await supabase
    .from("form_submissions")
    .select("*")
    .eq("matched", false)
    .order("created_at", { ascending: false });

  return (
    <DashboardShell title="Unmatched submissions">
      <Card>
        {(submissions ?? []).length === 0 ? (
          <p className="text-sm text-zinc-600">No unmatched submissions.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-zinc-500">
                  <th className="py-2 pr-4">Guest</th>
                  <th className="py-2 pr-4">Claimed booking ID</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {(submissions ?? []).map((s) => (
                  <tr key={s.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-4">{s.name}</td>
                    <td className="py-2 pr-4 font-medium">{s.claimed_airbnb_booking_id}</td>
                    <td className="py-2 pr-4">{s.whatsapp_number}</td>
                    <td className="py-2">{new Date(s.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}
