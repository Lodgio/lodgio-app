import { ListCardSkeleton } from "@/components/list-card-skeleton";

export function AdminPageFallback({ href = "/admin" }: { href?: string }) {
  const path = href.split("?")[0];

  if (path === "/admin/ops") {
    return (
      <div className="space-y-6">
        <ListCardSkeleton title="Problems" />
        <ListCardSkeleton title="WhatsApp log" />
      </div>
    );
  }

  if (path === "/admin/admins") {
    return (
      <div className="space-y-6">
        <ListCardSkeleton title="Add admin" />
        <ListCardSkeleton title="Current admins" />
      </div>
    );
  }

  if (path.startsWith("/admin/hosts/")) {
    return <ListCardSkeleton title="Host" />;
  }

  return (
    <div className="space-y-6">
      <ListCardSkeleton title="Gmail access requests" />
      <ListCardSkeleton title="Registered hosts" />
    </div>
  );
}
