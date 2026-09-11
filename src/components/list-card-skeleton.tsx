import { Card } from "@/components/dashboard-shell";

export function ListCardSkeleton({ title }: { title: string }) {
  return (
    <Card title={title}>
      <div className="space-y-3" aria-busy="true" aria-label={`Loading ${title.toLowerCase()}`}>
        <div className="h-20 animate-pulse rounded-lg bg-zinc-100" />
        <div className="h-20 animate-pulse rounded-lg bg-zinc-100" />
        <div className="h-20 animate-pulse rounded-lg bg-zinc-100" />
      </div>
    </Card>
  );
}
