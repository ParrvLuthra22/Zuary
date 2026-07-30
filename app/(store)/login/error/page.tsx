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

const GENERIC = {
  title: "Something went wrong.",
  body: "Something went wrong signing you in. Try again.",
};

/**
 * Auth.js error codes, mapped to copy a customer can act on.
 *
 * AccessDenied and Configuration deliberately share the generic wording:
 * spelling out that an address was refused, or that a provider is
 * misconfigured, tells a prober more about the account and the deployment than
 * it tells the person who is actually stuck.
 */
const COPY: Record<string, { title: string; body: string }> = {
  OAuthAccountNotLinked: {
    title: "Already registered.",
    body: "That email is already registered with a different sign-in method. Try the magic link instead.",
  },
  Verification: {
    title: "That link no longer works.",
    body: "That link expired or was already used. Request a new one.",
  },
  AccessDenied: GENERIC,
  Configuration: GENERIC,
};

export default async function LoginErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const copy = (error && COPY[error]) || GENERIC;

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-sm flex-col justify-center px-6 py-20">
      <p className="t-label text-accent-ink">Sign in</p>
      <h1 className="t-display-sm mt-4">{copy.title}</h1>
      <p className="mt-4 leading-relaxed text-fg-muted">{copy.body}</p>

      <ButtonZ asChild size="lg" className="mt-10 h-14 w-full">
        <Link href="/login">Back to sign in</Link>
      </ButtonZ>

      {/* Kept for support, not for the customer to interpret. */}
      {error ? (
        <p className="t-label mt-6 text-fg-muted">Reference: {error}</p>
      ) : null}
    </main>
  );
}
