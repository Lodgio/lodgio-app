import Link from "next/link";
import { LodgioLogo } from "@/components/lodgio-logo";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--lodgio-cream)]">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16">
        <LodgioLogo size="lg" />
        <h1 className="mt-8 text-4xl font-semibold tracking-tight text-[var(--lodgio-olive)]">
          Hospitality automation that actually saves time.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-[var(--lodgio-olive)]/80">
          Ingest Airbnb bookings from Gmail, collect guest details on WhatsApp, and send check-in
          instructions without another PMS.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="btn-accent">
            Get started
          </Link>
          <Link href="/login" className="btn-secondary">
            Sign in
          </Link>
        </div>
      </div>
      <footer className="section-ink">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-2xl font-medium leading-snug text-white sm:text-3xl">
            Spend more time hosting.
            <br />
            Let Lodgio handle the repetitive work.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="btn-accent">
              Get started
            </Link>
            <Link href="/login" className="btn-secondary">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
