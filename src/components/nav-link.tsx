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
  /** Extra path prefixes that also count as active (e.g. `/admin/hosts` for Hosts). */
  activePrefixes?: string[];
};

function pathMatchesPrefix(targetPath: string, prefix: string): boolean {
  return targetPath === prefix || targetPath.startsWith(`${prefix}/`);
}

function linkIsActive(
  pathname: string,
  search: string,
  href: string,
  exact: boolean | undefined,
  pendingHref: string | null,
  activePrefixes?: string[]
): boolean {
  const target = pendingHref ?? (search ? `${pathname}?${search}` : pathname);
  const [path, query = ""] = href.split("?");
  const [targetPath, targetQuery = ""] = target.split("?");

  if (activePrefixes?.some((prefix) => pathMatchesPrefix(targetPath, prefix))) {
    return true;
  }

  const treatExact = exact || path === "/dashboard";

  if (treatExact) {
    if (targetPath !== path) return false;
    if (!query) return targetQuery === "";
    return targetQuery === query;
  }

  return pathMatchesPrefix(targetPath, path);
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
      className={["block w-full", showPending ? pendingClassName : ""].filter(Boolean).join(" ")}
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
  activePrefixes,
}: NavLinkProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const { pendingHref, startNavigation } = useNavigationPending();
  const active = linkIsActive(pathname, search, href, exact, pendingHref, activePrefixes);

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
