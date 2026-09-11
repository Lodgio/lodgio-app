import Link from "next/link";

export function LodgioLogo({
  href,
  size = "md",
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
}) {
  const height = size === "sm" ? "h-7" : size === "lg" ? "h-12" : "h-9";
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/lodgio-logo.png" alt="Lodgio" className={`${height} w-auto`} />
  );
  if (!href) return image;
  return (
    <Link href={href} className="inline-flex items-center">
      {image}
    </Link>
  );
}
