import Link from "next/link";
import { signIn } from "@/app/(auth)/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in to Lodgio</h1>
        <p className="mt-1 text-sm text-zinc-600">Manage guest communication for your listings.</p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <form action={signIn} className="mt-6 space-y-3">
          <input name="email" type="email" required placeholder="Email" className="field" />
          <input name="password" type="password" required placeholder="Password" className="field" />
          <button className="btn-primary w-full">Sign in</button>
        </form>
        <p className="mt-4 text-sm text-zinc-600">
          No account?{" "}
          <Link href="/signup" className="text-blue-600">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
