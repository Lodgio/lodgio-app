import Link from "next/link";
import { requestPasswordReset } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/submit-button";
import { LodgioLogo } from "@/components/lodgio-logo";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 bg-[var(--lodgio-cream)]">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <LodgioLogo href="/" />
        <h1 className="mt-4 text-xl font-semibold text-[var(--lodgio-olive)]">Forgot password</h1>
        <p className="mt-2 text-sm text-zinc-600">
          We&apos;ll email a reset link if this address has an account. Until email is configured,
          an admin can set a new password for you.
        </p>
        {sent ? (
          <p className="mt-3 text-sm text-emerald-700">
            If that email is registered, a reset link is on its way.
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <form action={requestPasswordReset} className="mt-6 space-y-3">
          <input name="email" type="email" required placeholder="Email" className="field" />
          <SubmitButton className="btn-primary w-full" pendingLabel="Sending…">
            Send reset link
          </SubmitButton>
        </form>
        <p className="mt-4 text-sm">
          <Link href="/login" className="text-[var(--lodgio-ink)] underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
