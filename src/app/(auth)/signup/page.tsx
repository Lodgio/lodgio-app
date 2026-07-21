import Link from "next/link";
import { signUp } from "@/app/(auth)/actions";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Create your Lodgio account</h1>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <form action={signUp} className="mt-6 space-y-3">
          <input name="business_name" required placeholder="Business name" className="field" />
          <input name="email" type="email" required placeholder="Email" className="field" />
          <input name="password" type="password" required placeholder="Password" className="field" />
          <button className="btn-primary w-full">Create account</button>
        </form>
        <p className="mt-4 text-sm text-zinc-600">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
