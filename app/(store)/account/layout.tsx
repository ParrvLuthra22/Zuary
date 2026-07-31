import { redirect } from "next/navigation";

import { auth } from "@/server/auth/config";
import { AccountNav } from "@/client/components/account/AccountNav";

/**
 * Middleware already gates /account/*, but this layout re-checks.
 *
 * Middleware is a routing concern; a route reached without passing through it
 * would render with no session and every child would then read
 * `session.user.id` off undefined. Checking here means the session is a
 * guarantee for everything below, not an assumption.
 */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/account");

  return (
    <div className="px-6 pt-8 pb-24 md:px-12">
      <header className="border-b border-line pb-8">
        <h1 className="t-display-sm">Account</h1>
        {session.user.email ? (
          <p className="mt-2 font-mono text-sm break-all text-fg-muted">
            {session.user.email}
          </p>
        ) : null}
      </header>

      <div className="mt-8 md:mt-12 md:grid md:grid-cols-[13rem_1fr] md:gap-16">
        <div className="border-b border-line pb-2 md:border-b-0 md:pb-0">
          <AccountNav />
        </div>

        <div className="mt-8 min-w-0 md:mt-0">{children}</div>
      </div>
    </div>
  );
}
