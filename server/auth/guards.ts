import "server-only";

import { eq } from "drizzle-orm";

import { auth } from "@/server/auth/config";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { ForbiddenError, UnauthorizedError } from "@/shared/errors";

/**
 * The two authorisation gates. Every server action and every protected route
 * handler calls one of them as its first statement.
 *
 * These are NOT services. They read the session, which means they touch
 * cookies, so they sit in the handler layer's half of the boundary: a handler
 * calls a guard, gets an id, and passes that id to a service as a plain
 * argument. Services never call these and never learn where the id came from —
 * that is what lets the same service back a mobile endpoint with a bearer
 * token later.
 */

export type Actor = {
  id: string;
  name: string | null;
  email: string | null;
};

/**
 * Any signed-in customer.
 *
 * Trusts the JWT for identity only. Identity in a session token is exactly what
 * the token is for, and re-reading the users row on every request would put a
 * database round trip in front of every page. Authorisation is a different
 * question — see requireAdmin.
 */
export async function requireUser(): Promise<Actor> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) throw new UnauthorizedError();
  return { id: user.id, name: user.name ?? null, email: user.email ?? null };
}

/**
 * An admin, with the role read from the database rather than the token.
 *
 * A JWT here is a snapshot up to 30 days old, so an admin demoted this morning
 * would still be holding one that says otherwise. For a privileged write that
 * gap matters more than the round trip costs.
 *
 * Fails closed. If the role cannot be read it cannot be confirmed, and a check
 * that cannot confirm must refuse — falling back to the role in the token would
 * turn a database outage into a window where a revoked admin is admin again.
 * Logged loudly, because to a real admin this is indistinguishable from being
 * locked out for no reason.
 */
export async function requireAdmin(): Promise<Actor> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new UnauthorizedError();

  let row;
  try {
    [row] = await db
      .select({ role: users.role, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
  } catch (error) {
    console.error("[guard] admin role lookup failed — denying access", error);
    throw new ForbiddenError(undefined, { cause: error });
  }

  if (!row || row.role !== "admin") throw new ForbiddenError();

  return { id: userId, name: row.name, email: row.email };
}

/**
 * requireAdmin for an admin PAGE, converting a refusal into a 404.
 *
 * Must be the first statement of every admin page, not only of the layout.
 * Layouts and pages render in parallel, so by the time a layout throws the page
 * has already run its queries and started streaming — the response comes back
 * 200 with content in it. Verified, not theorised.
 *
 * 404 rather than 403 on purpose: a 403 confirms the route exists, which tells
 * an unauthenticated prober exactly where to point a credential-stuffing run. A
 * signed-in customer gets the same 404 as a stranger.
 */
export async function requireAdminPage(): Promise<Actor> {
  const { notFound } = await import("next/navigation");
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
      notFound();
    }
    throw error;
  }
}
