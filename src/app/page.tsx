import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16">
      <p className="text-sm font-medium text-zinc-500">Lodgio</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">
        Automated guest communication for Airbnb hosts
      </h1>
      <p className="mt-4 max-w-xl text-lg text-zinc-600">
        Ingest bookings from Gmail, collect guest details via a check-in form, and automate host
        workflows.
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
  );
}
