import { updatePassword } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/submit-button";
import { LodgioLogo } from "@/components/lodgio-logo";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 bg-[var(--lodgio-cream)]">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <LodgioLogo href="/" />
        <h1 className="mt-4 text-xl font-semibold text-[var(--lodgio-olive)]">Set a new password</h1>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <form action={updatePassword} className="mt-6 space-y-3">
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="New password"
            className="field"
          />
          <SubmitButton className="btn-primary w-full" pendingLabel="Saving…">
            Update password
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
