import "server-only";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { adminAuditLog, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export class NotAdminError extends Error {
  constructor() {
    super("NOT_ADMIN");
    this.name = "NotAdminError";
  }
}

/**
 * The guard every admin PAGE calls, before it fetches anything.
 *
 * The layout calls requireAdmin too, but a layout check alone is not enough:
 * layouts and pages render in parallel, so by the time a layout throws
 * notFound() the page has already run its queries and started streaming — the
 * response comes back 200 with page content in it. Verified, not theorised.
 *
 * Putting it at the top of the page is what actually stops the work happening
 * and produces a real 404. The layout keeps its copy so the chrome never
 * renders for a non-admin either.
 */
export async function requireAdminPage() {
  const { notFound } = await import("next/navigation");
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof NotAdminError) notFound();
    throw error;
  }
}

/**
 * The real authorisation gate.
 *
 * Every admin server action and page calls this. Middleware also guards
 * /admin/*, but middleware is a routing concern — a matcher typo, a rewrite, or
 * a server action invoked directly all reach the handler without it. Actions in
 * particular are plain POST endpoints: the client cannot be trusted to decide
 * who may call them.
 *
 * The role is read from the database, not from the JWT. A token is a snapshot
 * up to 30 days old, so an admin demoted this morning would still hold a token
 * saying otherwise. For a privileged write, that gap matters more than the
 * round trip costs.
 */
export async function requireAdmin() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new NotAdminError();

  let row;
  try {
    [row] = await db
      .select({ role: users.role, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
  } catch (error) {
    /*
     * Fail closed.
     *
     * If the role cannot be read, it cannot be confirmed, and an authorisation
     * check that cannot confirm must refuse. Falling back to the role in the
     * JWT would be the tempting fix and the wrong one — that token is a
     * snapshot up to 30 days old, so a database outage would become a window in
     * which a revoked admin is admin again.
     *
     * Logged loudly, because to an actual admin this is indistinguishable from
     * being locked out for no reason.
     */
    console.error("[admin] role lookup failed — denying access", error);
    throw new NotAdminError();
  }

  if (!row || row.role !== "admin") throw new NotAdminError();

  return { id: userId, name: row.name, email: row.email };
}

/**
 * Appends to the audit log.
 *
 * Deliberately not wrapped in the caller's transaction. An audit row is worth
 * having even when the action it describes partly failed, and a logging fault
 * must never roll back the work — so this swallows its own errors and only
 * complains to the console.
 */
export async function writeAudit(entry: {
  actorUserId: string;
  action: string;
  entity: string;
  entityId: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await db.insert(adminAuditLog).values({
      actorUserId: entry.actorUserId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      meta: entry.meta ?? null,
    });
  } catch (error) {
    console.error("[audit] write failed", entry.action, entry.entityId, error);
  }
}
