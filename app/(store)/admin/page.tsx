import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Admin",
  description: "Internal.",
  path: "/admin",
  noIndex: true,
});

/**
 * Placeholder. The admin surface itself is not built yet — this exists so the
 * middleware gate is observable: a customer gets a 404, an admin gets this.
 *
 * The session check below is not redundant with middleware. Middleware is a
 * routing concern and can be bypassed by anything that reaches the route
 * without passing through it, so every admin page re-checks the role server
 * side. Defence in depth is the whole point of putting authorisation in the
 * database rather than only in a cookie.
 */
export default async function AdminPage() {
  const session = await auth();

  // Same answer as the middleware gives, for the same reason.
  if (session?.user?.role !== "admin") notFound();

  return (
    <main className="px-6 py-24 md:px-12">
      <p className="t-label text-accent-ink">Internal</p>
      <h1 className="t-display-md mt-3">Admin.</h1>
      <p className="mt-5 max-w-prose text-sm leading-relaxed text-fg-muted">
        Signed in as {session.user.email} with the admin role. Orders, stock and
        image upload land here.
      </p>
    </main>
  );
}
