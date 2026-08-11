"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

type NavigationPendingContextValue = {
  pendingHref: string | null;
  isPending: boolean;
  startNavigation: (href: string) => void;
};

const NavigationPendingContext = createContext<NavigationPendingContextValue>({
  pendingHref: null,
  isPending: false,
  startNavigation: () => {},
});

function hrefFromLocation(pathname: string, search: string): string {
  return search ? `${pathname}?${search}` : pathname;
}

export function NavigationPendingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const currentHref = hrefFromLocation(pathname, search);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [currentHref]);

  const startNavigation = useCallback(
    (href: string) => {
      const normalized = href.startsWith("/") ? href : `/${href}`;
      if (normalized === currentHref) return;
      setPendingHref(normalized);
    },
    [currentHref]
  );

  const value = useMemo(
    () => ({
      pendingHref,
      isPending: pendingHref !== null && pendingHref !== currentHref,
      startNavigation,
    }),
    [pendingHref, currentHref, startNavigation]
  );

  return (
    <NavigationPendingContext.Provider value={value}>
      {children}
    </NavigationPendingContext.Provider>
  );
}

export function useNavigationPending() {
  return useContext(NavigationPendingContext);
}
