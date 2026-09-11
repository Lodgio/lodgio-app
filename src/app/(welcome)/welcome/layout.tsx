import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHost } from "@/lib/host";
import { LodgioLogo } from "@/components/lodgio-logo";

export default async function WelcomeLayout({ children }: { children: React.ReactNode }) {
  const host = await getCurrentHost();
  if (!host) redirect("/login");

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("host_settings")
    .select("whatsapp_verified_at, checkin_link_confirmed_at")
    .eq("host_id", host.id)
    .maybeSingle();

  if (settings?.whatsapp_verified_at && settings?.checkin_link_confirmed_at) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--lodgio-cream)] px-4 py-10 text-zinc-900">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="flex justify-center">
            <LodgioLogo href="https://lodgio.in" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-[var(--lodgio-olive)]">
            Just a couple more steps
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Finish setting up your account before you get started.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
