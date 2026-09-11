import { PageCard } from "@/components/page-card";

export function ListCardSkeleton({ title }: { title: string }) {
  return (
    <PageCard title={title}>
      <div className="space-y-3" aria-busy="true" aria-label={`Loading ${title.toLowerCase()}`}>
        <div className="h-20 animate-pulse rounded-lg bg-zinc-100" />
        <div className="h-20 animate-pulse rounded-lg bg-zinc-100" />
        <div className="h-20 animate-pulse rounded-lg bg-zinc-100" />
      </div>
    </PageCard>
  );
}
