import { requireAdmin } from "@/lib/admin";
import { AdminShell } from "@/components/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side guard for the whole /admin group (defense-in-depth on top of middleware).
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
