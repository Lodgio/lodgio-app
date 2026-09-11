import { getCurrentHost } from "@/lib/host";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/submit-button";
import { AirbnbPasteGuide, airbnbGuideImages } from "@/components/airbnb-paste-guide";
import { confirmCheckinLink } from "@/app/(welcome)/welcome/actions";

export default async function WelcomeStep2() {
  const host = await getCurrentHost();
  if (!host) redirect("/login");

  const formLink = `${env.appBaseUrl}/${host.slug}/checkin`;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      {airbnbGuideImages.map((href) => (
        <link key={href} rel="preload" as="image" href={href} />
      ))}
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Step 2 of 2</p>
      <h2 className="mt-1 text-lg font-semibold">Add your guest check-in link</h2>
      <p className="mt-2 text-sm text-zinc-600">
        Paste this link into your Airbnb Booking confirmation quick reply. New guests complete
        check-in without you sending it by hand.
      </p>

      <code className="mt-4 block rounded-md bg-zinc-100 p-3 text-sm break-all">{formLink}</code>
      <div className="mt-3">
        <CopyButton value={formLink} />
      </div>

      <AirbnbPasteGuide>
        <form action={confirmCheckinLink} className="mt-6 border-t border-zinc-100 pt-5">
          <SubmitButton className="btn-primary w-full" pendingLabel="Continuing…">
            Okay, I&apos;ve pasted it
          </SubmitButton>
        </form>
        <p className="mt-2 text-xs text-zinc-500">You can find this link again later in Settings.</p>
      </AirbnbPasteGuide>
    </div>
  );
}
