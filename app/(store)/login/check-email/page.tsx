import type { Metadata } from "next";
import Link from "next/link";

import { TriangleA } from "@/components/layout/Wordmark";
import { ButtonZ } from "@/components/ui/button-z";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Check your email",
  description: "A sign-in link is on its way.",
  path: "/login/check-email",
  noIndex: true,
});

/** Auth.js `verifyRequest` page — where the magic-link flow lands. */
export default function CheckEmailPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <span style={{ fontSize: "48px" }}>
        <TriangleA />
      </span>

      <h1 className="t-display-md">Check your email.</h1>

      <p className="text-sm leading-relaxed text-fg-muted">
        We&rsquo;ve sent you a sign-in link. It is good for one use and expires in
        24 hours. If it does not arrive in a minute, check spam.
      </p>

      <ButtonZ asChild variant="outline">
        <Link href="/login">Use a different address</Link>
      </ButtonZ>
    </main>
  );
}
