import Link from "next/link";
import { LodgioLogo } from "@/components/lodgio-logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--lodgio-cream)]">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16">
        <LodgioLogo size="lg" />
        <h1 className="mt-8 text-4xl font-semibold tracking-tight text-[var(--lodgio-olive)]">
          Hospitality automation that actually saves time.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-zinc-600">
          Ingest Airbnb bookings from Gmail, collect guest details on WhatsApp, and send check-in
          instructions without another PMS.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="btn-primary">
            Get started
          </Link>
          <Link href="/login" className="btn-secondary">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
