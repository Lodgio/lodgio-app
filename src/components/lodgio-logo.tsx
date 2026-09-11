import Link from "next/link";

export function LodgioLogo({
  href,
  size = "md",
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
}) {
  const height = size === "sm" ? "h-7" : size === "lg" ? "h-14" : "h-9";
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/lodgio-logo.png"
      alt="Lodgio"
      className={`${height} w-auto max-w-[220px] object-contain object-left`}
    />
  );
  const mark = (
    <span className="inline-flex shrink-0 self-start">{image}</span>
  );
  if (!href) return mark;
  const className = "inline-flex shrink-0 self-start items-center";
  if (href.startsWith("http")) {
    return (
      <a href={href} className={className}>
        {image}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {image}
    </Link>
  );
}
