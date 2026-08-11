"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useNavigationPending } from "@/components/navigation-pending";

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  /** Exact pathname (+ query if present). Default: prefix match; `/dashboard` is always exact. */
  exact?: boolean;
};

function linkIsActive(
  pathname: string,
  search: string,
  href: string,
  exact: boolean | undefined,
  pendingHref: string | null
): boolean {
  const target = pendingHref ?? (search ? `${pathname}?${search}` : pathname);
  const [path, query = ""] = href.split("?");
  const [targetPath, targetQuery = ""] = target.split("?");
  const treatExact = exact || path === "/dashboard";

  if (treatExact) {
    if (targetPath !== path) return false;
    if (!query) return targetQuery === "";
    return targetQuery === query;
  }

  return targetPath === path || targetPath.startsWith(`${path}/`);
}

function NavLinkPending({
  href,
  children,
  pendingClassName,
}: {
  href: string;
  children: React.ReactNode;
  pendingClassName: string;
}) {
  const { pending } = useLinkStatus();
  const { pendingHref } = useNavigationPending();
  const showPending = pending || pendingHref === href;
  return (
    <span
      className={showPending ? pendingClassName : undefined}
      aria-busy={showPending || undefined}
    >
      {children}
    </span>
  );
}

export function NavLink({
  href,
  children,
  className = "",
  activeClassName = "",
  pendingClassName = "opacity-70",
  exact = false,
}: NavLinkProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const { pendingHref, startNavigation } = useNavigationPending();
  const active = linkIsActive(pathname, search, href, exact, pendingHref);

  return (
    <Link
      href={href}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        startNavigation(href);
      }}
      className={[className, active ? activeClassName : ""].filter(Boolean).join(" ")}
      aria-current={active ? "page" : undefined}
    >
      <NavLinkPending href={href} pendingClassName={pendingClassName}>
        {children}
      </NavLinkPending>
    </Link>
  );
}
