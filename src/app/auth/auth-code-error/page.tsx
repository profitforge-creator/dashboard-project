import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6 text-center">
      <div>
        <h1 className="text-xl font-semibold text-text">That sign-in link didn&apos;t work</h1>
        <p className="mt-2 text-sm text-text-secondary">It may have expired. Request a new one.</p>
        <Link href="/login" className="mt-6 inline-block rounded-xl bg-blue px-4 py-2.5 text-sm font-semibold text-white">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
