export function PageCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      {title ? (
        <h2 className="mb-4 text-base font-semibold text-[var(--lodgio-olive)]">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}
