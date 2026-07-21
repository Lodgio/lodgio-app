import { redirect } from "next/navigation";
import { isWhatsAppEnabled } from "@/lib/features";

export type DemoMode = "full" | "phase12";

export function getDemoMode(): DemoMode {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "phase12" ? "phase12" : "full";
}

export function isPhase12Demo(): boolean {
  return getDemoMode() === "phase12";
}

const FULL_NAV = [
  { href: "/dashboard/onboarding", label: "Onboarding" },
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/bookings", label: "Bookings", countKey: "bookings" },
  { href: "/dashboard/submissions", label: "Submissions", countKey: "submissions" },
  { href: "/dashboard/properties", label: "Properties", countKey: "properties" },
  { href: "/dashboard/caretakers", label: "Caretakers", countKey: "caretakers" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

const PHASE12_NAV = [
  { href: "/dashboard/onboarding", label: "Connect Gmail" },
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/bookings", label: "Bookings", countKey: "bookings" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

export type NavCountKey = "bookings" | "submissions" | "properties" | "caretakers";

export function getDashboardNav() {
  return isPhase12Demo() ? PHASE12_NAV : FULL_NAV;
}

export function assertFullModeRoute() {
  if (isPhase12Demo()) {
    redirect("/dashboard");
  }
}

/** In Phase 1&2 demo, a parsed email booking is success — not "waiting for guest form". */
export function formatBookingStatus(status: string): string {
  if (isPhase12Demo() && status === "awaiting_guest_form") {
    return "parsed from email";
  }
  if (!isWhatsAppEnabled() && status === "messaging") {
    return "processing";
  }
  return status.replaceAll("_", " ");
}

export function bookingStatusColor(status: string): string {
  if (isPhase12Demo() && status === "awaiting_guest_form") {
    return "bg-emerald-100 text-emerald-800";
  }
  const colors: Record<string, string> = {
    ingested: "bg-zinc-100 text-zinc-700",
    awaiting_guest_form: "bg-amber-100 text-amber-800",
    matched: "bg-blue-100 text-blue-800",
    messaging: "bg-indigo-100 text-indigo-800",
    completed: "bg-emerald-100 text-emerald-800",
    failed: "bg-red-100 text-red-800",
    active: "bg-emerald-100 text-emerald-800",
    needs_reconnect: "bg-red-100 text-red-800",
  };
  return colors[status] ?? "bg-zinc-100 text-zinc-700";
}
