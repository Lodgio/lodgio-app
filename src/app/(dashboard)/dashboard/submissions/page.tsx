import { Card } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { assertFullModeRoute } from "@/lib/demo";
import { ViewGuestIdButton } from "@/components/view-guest-id-button";

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  assertFullModeRoute();
  const supabase = await createClient();
  const { data: submissions } = await supabase
    .from("form_submissions")
    .select("*")
    .eq("matched", false)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
    {error ? (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {decodeURIComponent(error)}
      </p>
    ) : null}
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
                  <th className="py-2 pr-4">WhatsApp</th>
                  <th className="py-2 pr-4">Submitted</th>
                  <th className="py-2">ID</th>
                </tr>
              </thead>
              <tbody>
                {(submissions ?? []).map((s) => (
                  <tr key={s.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-4">{s.name}</td>
                    <td className="py-2 pr-4 font-medium">{s.claimed_airbnb_booking_id}</td>
                    <td className="py-2 pr-4">{s.whatsapp_number}</td>
                    <td className="py-2 pr-4">{new Date(s.created_at).toLocaleString()}</td>
                    <td className="py-2">
                      {s.id_document_path ? (
                        <ViewGuestIdButton
                          submissionId={s.id}
                          next="/dashboard/submissions"
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
