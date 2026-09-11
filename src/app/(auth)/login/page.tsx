import Link from "next/link";
import { signIn } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/submit-button";
import { LodgioLogo } from "@/components/lodgio-logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const { error, reset } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 bg-[var(--lodgio-cream)]">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <LodgioLogo href="/" />
        <h1 className="mt-4 text-xl font-semibold text-[var(--lodgio-olive)]">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-600">Manage guest communication for your listings.</p>
        {reset ? (
          <p className="mt-3 text-sm text-emerald-700">Password updated. Sign in with the new one.</p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <form action={signIn} className="mt-6 space-y-3">
          <input name="email" type="email" required placeholder="Email" className="field" />
          <input name="password" type="password" required placeholder="Password" className="field" />
          <SubmitButton className="btn-primary w-full" pendingLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>
        <p className="mt-4 text-sm text-zinc-600">
          <Link href="/forgot-password" className="text-[var(--lodgio-ink)] underline">
            Forgot password?
          </Link>
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          No account?{" "}
          <Link href="/signup" className="text-[var(--lodgio-ink)] underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
