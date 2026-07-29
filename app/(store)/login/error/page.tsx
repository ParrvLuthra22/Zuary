import type { Metadata } from "next";
import Link from "next/link";

import { ButtonZ } from "@/components/ui/button-z";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Sign-in problem",
  description: "Something went wrong signing in.",
  path: "/login/error",
  noIndex: true,
});

/**
 * Auth.js `error` page. The codes are documented and safe to surface, but the
 * copy stays vague about anything that would confirm whether an account exists.
 */
const COPY: Record<string, { title: string; body: string }> = {
  Configuration: {
    title: "Sign-in is misconfigured.",
    body: "This is our problem, not yours. The provider keys are missing or wrong on the server.",
  },
  AccessDenied: {
    title: "That sign-in was declined.",
    body: "You cancelled at the provider, or the address is not permitted.",
  },
  Verification: {
    title: "That link no longer works.",
    body: "Sign-in links are single-use and expire after 24 hours. Request a fresh one.",
  },
};

export default async function LoginErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const copy = (error && COPY[error]) || {
    title: "Something went wrong.",
    body: "We could not complete that sign-in. Try again.",
  };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-6 py-24">
      <p className="t-label text-accent-ink">Sign in</p>
      <h1 className="t-display-md mt-3">{copy.title}</h1>
      <p className="mt-5 text-sm leading-relaxed text-fg-muted">{copy.body}</p>

      {error ? (
        <p className="t-label mt-6 text-fg-muted">Code: {error}</p>
      ) : null}

      <div className="mt-10 flex gap-3">
        <ButtonZ asChild>
          <Link href="/login">Try again</Link>
        </ButtonZ>
        <ButtonZ asChild variant="outline">
          <Link href="/">Home</Link>
        </ButtonZ>
      </div>
    </main>
  );
}
