import "server-only";

import { eq } from "drizzle-orm";

import { db, type Db } from "@/server/db";
import {
  getCustomerForAdmin,
  listCustomersForAdmin,
  listOrdersForAdmin,
  listWaitlistForAdmin,
  type CustomerSort,
  type OrderFilter,
} from "@/server/db/queries";
import { adminAuditLog, users } from "@/server/db/schema";
import { NotFoundError } from "@/shared/errors";

/**
 * Admin-side business logic.
 *
 * Framework-agnostic like every service here: plain arguments in, plain data or
 * a typed error out. Nothing in this file knows what a Request is.
 */

/* ── Audit ─────────────────────────────────────────────────── */

export type AuditEntry = {
  actorUserId: string;
  action: string;
  entity: string;
  entityId: string;
  meta?: Record<string, unknown>;
};

/**
 * Appends to the audit log.
 *
 * Takes a `Db`, so the caller decides whether this joins their transaction.
 * Every mutating admin service passes its `tx` — which is a deliberate change
 * from how this worked before, and the trade is worth stating plainly:
 *
 * Inside the transaction, an audit write that fails rolls back the action it
 * was describing. That means a logging fault can block an admin from shipping
 * an order, which is annoying. Outside it, the mutation commits and the audit
 * row silently does not — which means the log claims a privileged change never
 * happened. For a table whose entire purpose is answering "who changed this",
 * a gap is worse than a refusal: an audit log that is sometimes wrong cannot be
 * used as evidence at all, and nobody can tell which rows are the missing ones.
 *
 * So it is all-or-nothing on purpose. Fail loudly, not quietly.
 */
export async function auditLog(entry: AuditEntry, tx: Db = db): Promise<void> {
  await tx.insert(adminAuditLog).values({
    actorUserId: entry.actorUserId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    meta: entry.meta ?? null,
  });
}

/* ── Reads ─────────────────────────────────────────────────── */

export function listOrders(params: {
  filter?: OrderFilter;
  search?: string;
  page?: number;
}) {
  return listOrdersForAdmin(params);
}

export function getCustomers(params: { sort?: CustomerSort } = {}) {
  return listCustomersForAdmin(params.sort);
}

export async function getCustomer(userId: string) {
  const customer = await getCustomerForAdmin(userId);
  if (!customer) throw new NotFoundError("No such customer.");
  return customer;
}

export function getWaitlist() {
  return listWaitlistForAdmin();
}

/* ── Mutations ─────────────────────────────────────────────── */

/**
 * Grants or revokes early access.
 *
 * The audit row is written in the same transaction as the flag, so the log and
 * the state cannot disagree.
 */
export async function setEarlyAccess(input: {
  userId: string;
  enabled: boolean;
  actorUserId: string;
}) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(users)
      .set({ earlyAccess: input.enabled })
      .where(eq(users.id, input.userId))
      .returning({ id: users.id, earlyAccess: users.earlyAccess });

    if (!row) throw new NotFoundError("No such customer.");

    await auditLog(
      {
        actorUserId: input.actorUserId,
        action: input.enabled
          ? "customer.early_access.grant"
          : "customer.early_access.revoke",
        entity: "user",
        entityId: input.userId,
      },
      tx,
    );

    return row;
  });
}
