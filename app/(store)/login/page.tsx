import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth/config";
import { LoginForm } from "@/client/components/auth/LoginForm";
import { Wordmark } from "@/client/components/layout/Wordmark";
import { pageMetadata } from "@/shared/constants/site";

export const metadata: Metadata = pageMetadata({
  title: "Sign in",
  description: "Sign in to ZUARY for order history and saved addresses.",
  path: "/login",
  noIndex: true,
});

type Search = { next?: string; error?: string };

/**
 * ?next is attacker-controllable, so it is treated as untrusted input: a single
 * leading slash and nothing that could become an absolute URL. `//evil.com` and
 * `/\evil.com` are both browser-valid ways to leave the origin, which is why
 * they are checked for explicitly rather than trusting the leading "/".
 */
function safeNext(raw: string | undefined): string {
  if (!raw) return "/account";
  const value = raw.trim();
  if (!value.startsWith("/")) return "/account";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/account";
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { next, error } = await searchParams;
  const target = safeNext(next);

  const session = await auth();
  if (session?.user) redirect(target);

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-sm flex-col justify-center px-6 py-20">
      <Wordmark className="t-display-sm !text-lg text-fg" />

      <h1 className="t-display-md mt-8">Sign in.</h1>
      <p className="mt-4 text-sm leading-relaxed text-fg-muted">
        Order history, saved addresses, and first access to drops.
      </p>

      <LoginForm
        next={target}
        initialError={error}
        /* Read on the server so the button is simply absent from the markup
           when the flag is off, rather than shipped and hidden. */
        phoneEnabled={process.env.ENABLE_PHONE_OTP === "true"}
      />

      <p className="t-label mt-10 leading-relaxed text-fg-muted">
        By continuing you agree to our{" "}
        <Link
          href="/policies/terms"
          className="text-accent-ink underline-offset-4 hover:underline"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="/policies/privacy"
          className="text-accent-ink underline-offset-4 hover:underline"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
