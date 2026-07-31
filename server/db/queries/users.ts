import "server-only";

import {
  and,
  count,
  desc,
  eq,
  inArray,
  sql,
  sum,
} from "drizzle-orm";

import { db } from "@/server/db";
import type { CustomerSort } from "./types";
import {
  addresses,
  orders,
  users,
  waitlist,
  wishlist,
  type NewAddress,
  type OrderStatus,
} from "@/server/db/schema";

export async function addToWaitlist(
  email: string,
  source: string,
  /** Set only by the per-product notify drawer; both stay null elsewhere. */
  details: { productSlug?: string; size?: string } = {},
) {
  const [row] = await db
    .insert(waitlist)
    .values({
      email,
      source,
      productSlug: details.productSlug ?? null,
      size: details.size ?? null,
    })
    .returning();
  return row;
}

/* ── Account: addresses ────────────────────────────────────── */

/**
 * The customer's own orders, newest first, each with its lines.
 *
 * Two queries rather than a join: a join across orders and orderItems returns
 * one row per line, and collapsing that back into orders in JS is more code and
 * more allocations than simply asking twice. The `inArray` keeps it at two
 * round trips regardless of how many orders there are.
 */
export async function listAddresses(userId: string) {
  return db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
}

/**
 * Saves an address, and if it is being made default, clears the previous one in
 * the same transaction. Two statements outside a transaction can leave the
 * account with two defaults or none, and "none" silently breaks checkout
 * prefill.
 *
 * The first address a customer saves becomes their default whatever they asked
 * for — an account with addresses and no default is a state nothing handles.
 */
/**
 * Saves an address, and if it is being made default, clears the previous one in
 * the same transaction. Two statements outside a transaction can leave the
 * account with two defaults or none, and "none" silently breaks checkout
 * prefill.
 *
 * The first address a customer saves becomes their default whatever they asked
 * for — an account with addresses and no default is a state nothing handles.
 */
export async function createAddress(input: NewAddress) {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(eq(addresses.userId, input.userId));

    const makeDefault = input.isDefault || existing.length === 0;

    if (makeDefault) {
      await tx
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, input.userId));
    }

    const [row] = await tx
      .insert(addresses)
      .values({ ...input, isDefault: makeDefault })
      .returning();
    return row;
  });
}

export async function updateAddress(
  addressId: string,
  userId: string,
  patch: Omit<NewAddress, "userId" | "id">,
) {
  return db.transaction(async (tx) => {
    if (patch.isDefault) {
      await tx
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, userId));
    }

    const [row] = await tx
      .update(addresses)
      .set(patch)
      // userId in the predicate, so one customer cannot edit another's row by id.
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
      .returning();
    return row;
  });
}

/**
 * Deletes an address and, if it was the default, promotes the newest survivor.
 * Otherwise deleting the default leaves the account with none.
 */
/**
 * Deletes an address and, if it was the default, promotes the newest survivor.
 * Otherwise deleting the default leaves the account with none.
 */
export async function deleteAddress(addressId: string, userId: string) {
  return db.transaction(async (tx) => {
    const [removed] = await tx
      .delete(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
      .returning();

    if (!removed) return undefined;

    if (removed.isDefault) {
      const [next] = await tx
        .select({ id: addresses.id })
        .from(addresses)
        .where(eq(addresses.userId, userId))
        .orderBy(desc(addresses.createdAt))
        .limit(1);

      if (next) {
        await tx
          .update(addresses)
          .set({ isDefault: true })
          .where(eq(addresses.id, next.id));
      }
    }

    return removed;
  });
}

export async function setDefaultAddress(addressId: string, userId: string) {
  return db.transaction(async (tx) => {
    await tx
      .update(addresses)
      .set({ isDefault: false })
      .where(eq(addresses.userId, userId));

    const [row] = await tx
      .update(addresses)
      .set({ isDefault: true })
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
      .returning();
    return row;
  });
}

/* ── Account: wishlist ─────────────────────────────────────── */

export async function listWishlistSlugs(userId: string) {
  const rows = await db
    .select({ productSlug: wishlist.productSlug })
    .from(wishlist)
    .where(eq(wishlist.userId, userId))
    .orderBy(desc(wishlist.createdAt));
  return rows.map((row) => row.productSlug);
}

/**
 * Flips one slug and reports where it landed.
 *
 * The insert is onConflictDoNothing so a double-click cannot fail on the
 * composite primary key, and the returning() length tells us whether this call
 * was the one that added it.
 */
/**
 * Flips one slug and reports where it landed.
 *
 * The insert is onConflictDoNothing so a double-click cannot fail on the
 * composite primary key, and the returning() length tells us whether this call
 * was the one that added it.
 */
export async function toggleWishlist(userId: string, productSlug: string) {
  const [existing] = await db
    .select({ productSlug: wishlist.productSlug })
    .from(wishlist)
    .where(
      and(eq(wishlist.userId, userId), eq(wishlist.productSlug, productSlug)),
    )
    .limit(1);

  if (existing) {
    await db
      .delete(wishlist)
      .where(
        and(eq(wishlist.userId, userId), eq(wishlist.productSlug, productSlug)),
      );
    return { saved: false };
  }

  await db
    .insert(wishlist)
    .values({ userId, productSlug })
    .onConflictDoNothing();
  return { saved: true };
}

/* ── Account: user flags ───────────────────────────────────── */

export async function getUserFlags(userId: string) {
  const [row] = await db
    .select({ earlyAccess: users.earlyAccess, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row;
}

/**
 * Marks an order shipped and records the courier reference.
 *
 * Returns the row so the caller can decide whether to mail. Nothing calls this
 * yet — the admin surface that will is B07. It lives here rather than in the
 * admin route so the shipped email has one trigger, not one per caller.
 */
/**
 * Customers with their order aggregates.
 *
 * Only paid-or-later orders count towards spend — an abandoned 'created' row is
 * an attempt, not money, and counting it would overstate every total on the
 * page. Left join so a customer with no orders still appears.
 */
export async function listCustomersForAdmin(sort: CustomerSort = "spent") {
  const spendable = inArray(orders.status, [
    "paid",
    "shipped",
    "delivered",
  ] as OrderStatus[]);

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      earlyAccess: users.earlyAccess,
      role: users.role,
      createdAt: users.createdAt,
      orderCount: count(orders.id),
      totalSpent: sql<number>`coalesce(${sum(orders.totalInr)}, 0)::int`,
    })
    .from(users)
    .leftJoin(orders, and(eq(orders.userId, users.id), spendable))
    .groupBy(users.id)
    .orderBy(
      sort === "orders"
        ? desc(count(orders.id))
        : sort === "joined"
          ? desc(users.createdAt)
          : desc(sql`coalesce(${sum(orders.totalInr)}, 0)`),
    );

  return rows;
}

export async function getCustomerForAdmin(userId: string) {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row;
}

export async function listWaitlistForAdmin() {
  return db.select().from(waitlist).orderBy(desc(waitlist.createdAt));
}
