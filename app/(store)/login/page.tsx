import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { auth } from "@/auth";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Sign in",
  description: "Sign in to ZUARY to track orders and save addresses.",
  path: "/login",
  noIndex: true,
});

/** Only ever an in-app path. See safeNext below. */
type Search = { next?: string; error?: string };

/**
 * Whatever comes back in ?next is attacker-controllable, so it is treated as
 * untrusted: single leading slash, no protocol-relative "//evil.com", no
 * backslash tricks. Anything else falls back to /account.
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

  // Already signed in — nothing to do here.
  const session = await auth();
  if (session?.user) redirect(target);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-6 py-24">
      <p className="t-label text-accent-ink">Account</p>
      <h1 className="t-display-md mt-3">Sign in.</h1>
      <p className="mt-5 text-sm leading-relaxed text-fg-muted">
        To track an order, save an address, or check out faster. No password —
        we send a link, or you use Google.
      </p>

      <LoginForm next={target} initialError={error} />

      <p className="t-label mt-10 text-fg-muted">
        By signing in you accept our{" "}
        <Link href="/policies/terms" className="text-accent-ink hover:underline">
          terms
        </Link>{" "}
        and{" "}
        <Link
          href="/policies/privacy"
          className="text-accent-ink hover:underline"
        >
          privacy policy
        </Link>
        .
      </p>
    </main>
  );
}
