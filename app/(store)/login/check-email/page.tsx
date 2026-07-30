import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

import { TriangleA } from "@/components/layout/Wordmark";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Check your inbox",
  description: "A sign-in link is on its way.",
  path: "/login/check-email",
  noIndex: true,
});

/**
 * The address comes back through the query string, so it is validated before it
 * is shown. React escapes it either way, but an unvalidated value would let
 * anyone put arbitrary text into a page that looks like it is talking about
 * their account — so anything that is not an email is dropped and the copy
 * falls back to the generic wording.
 */
const emailSchema = z.string().email().max(254);

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const parsed = emailSchema.safeParse(email);
  const address = parsed.success ? parsed.data : null;

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-sm flex-col justify-center px-6 py-20">
      <span style={{ fontSize: "48px" }}>
        <TriangleA />
      </span>

      <h1 className="t-display-sm mt-8">Check your inbox.</h1>

      <p className="mt-4 leading-relaxed text-fg-muted">
        {address ? (
          <>
            We sent a sign-in link to{" "}
            <span className="font-mono text-fg break-all">{address}</span>. It
            expires in 24 hours.
          </>
        ) : (
          <>We sent you a sign-in link. It expires in 24 hours.</>
        )}
      </p>

      <Link
        href="/login"
        className="t-label mt-10 self-start text-accent-ink underline-offset-4 hover:underline"
      >
        Wrong address? Start again →
      </Link>
    </main>
  );
}
