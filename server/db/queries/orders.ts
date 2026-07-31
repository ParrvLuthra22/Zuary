import "server-only";

import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/server/db";
import {
  ORDERS_PER_PAGE,
  type OrderFilter,
} from "./types";
import {
  adminAuditLog,
  orderItems,
  orders,
  users,
  variants,
  type NewOrderItem,
  type OrderStatus,
  type ShippingAddress,
} from "@/server/db/schema";

function filterCondition(filter: OrderFilter) {
  switch (filter) {
    case "unshipped":
      return eq(orders.status, "paid");
    case "shipped":
      return eq(orders.status, "shipped");
    case "delivered":
      return eq(orders.status, "delivered");
    case "failed":
      return eq(orders.status, "failed");
    case "cancelled":
      return eq(orders.status, "cancelled");
    default:
      return undefined;
  }
}

/**
 * Search across the three things someone has to hand when a customer calls:
 * the order number they read out, their email, or their phone.
 *
 * The order number is the first eight hex characters of the uuid with the
 * dashes stripped, so it cannot be matched with a plain LIKE against `id`.
 * The expression below rebuilds the same short form in SQL and compares that.
 */
function searchCondition(term: string) {
  const q = term.trim();
  if (!q) return undefined;

  const like = `%${q}%`;
  return or(
    ilike(orders.email, like),
    ilike(orders.phone, like),
    sql`upper(left(replace(${orders.id}::text, '-', ''), 8)) like ${`%${q.toUpperCase().replace(/-/g, "")}%`}`,
  );
}

export async function createOrder(input: {
  email: string;
  phone: string;
  address: ShippingAddress;
  subtotalInr: number;
  shippingInr: number;
  totalInr: number;
  razorpayOrderId: string;
  items: Omit<NewOrderItem, "orderId">[];
  /** Null for a guest checkout. Without it the order never reaches /account. */
  userId?: string | null;
}) {
  const [order] = await db
    .insert(orders)
    .values({
      userId: input.userId ?? null,
      email: input.email,
      phone: input.phone,
      addressJson: input.address,
      subtotalInr: input.subtotalInr,
      shippingInr: input.shippingInr,
      totalInr: input.totalInr,
      razorpayOrderId: input.razorpayOrderId,
      status: "created",
    })
    .returning();

  if (input.items.length > 0) {
    await db
      .insert(orderItems)
      .values(input.items.map((item) => ({ ...item, orderId: order.id })));
  }

  return order;
}

export async function getOrderByRazorpayOrderId(razorpayOrderId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.razorpayOrderId, razorpayOrderId))
    .limit(1);
  return order;
}

export async function getOrderWithItems(id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return undefined;
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id));
  return { ...order, items };
}

export async function listOrdersByEmail(email: string) {
  return db
    .select()
    .from(orders)
    .where(eq(orders.email, email))
    .orderBy(desc(orders.createdAt));
}

export async function markOrderStatus(
  razorpayOrderId: string,
  status: OrderStatus,
  razorpayPaymentId?: string,
) {
  const [order] = await db
    .update(orders)
    .set({
      status,
      ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(orders.razorpayOrderId, razorpayOrderId))
    .returning();
  return order;
}

/**
 * The customer's own orders, newest first, each with its lines.
 *
 * Two queries rather than a join: a join across orders and orderItems returns
 * one row per line, and collapsing that back into orders in JS is more code and
 * more allocations than simply asking twice. The `inArray` keeps it at two
 * round trips regardless of how many orders there are.
 */
export async function listOrdersForUser(userId: string) {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));

  if (rows.length === 0) return [];

  const lines = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((order) => order.id),
      ),
    );

  return rows.map((order) => ({
    ...order,
    items: lines.filter((line) => line.orderId === order.id),
  }));
}

/**
 * One order, but only if it belongs to this user.
 *
 * Ownership is part of the WHERE clause, not a check on the result. Fetching by
 * id and comparing afterwards works too, but it means the row is in memory
 * before the decision — one careless edit away from leaking. This way another
 * customer's id is indistinguishable from one that does not exist.
 */
export async function getOrderForUser(orderId: string, userId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);

  if (!order) return undefined;

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  return { ...order, items };
}

/* ── Admin ─────────────────────────────────────────────────── */

/**
 * Marks an order shipped and records the courier reference.
 *
 * Returns the row so the caller can decide whether to mail. Nothing calls this
 * yet — the admin surface that will is B07. It lives here rather than in the
 * admin route so the shipped email has one trigger, not one per caller.
 */
export async function markOrderShipped(
  orderId: string,
  courier: { name: string; awb: string; trackingUrl?: string | null },
) {
  const [row] = await db
    .update(orders)
    .set({
      status: "shipped",
      courier: courier.name,
      trackingNumber: courier.awb,
      trackingUrl: courier.trackingUrl ?? null,
      updatedAt: new Date(),
    })
    // Only a paid order can ship. Guarding here means a double-click, or a
    // retry against an already-shipped order, updates nothing and returns
    // undefined rather than re-sending the email.
    .where(and(eq(orders.id, orderId), eq(orders.status, "paid")))
    .returning();
  return row;
}
export async function listOrdersForAdmin({
  filter = "unshipped",
  search = "",
  page = 1,
}: {
  filter?: OrderFilter;
  search?: string;
  page?: number;
}) {
  const conditions = [filterCondition(filter), searchCondition(search)].filter(
    Boolean,
  );
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(orders)
    .where(where);

  const rows = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(ORDERS_PER_PAGE)
    .offset((page - 1) * ORDERS_PER_PAGE);

  // Item counts in one grouped query rather than one per row.
  const ids = rows.map((r) => r.id);
  const counts = ids.length
    ? await db
        .select({
          orderId: orderItems.orderId,
          items: sql<number>`sum(${orderItems.qty})::int`,
        })
        .from(orderItems)
        .where(inArray(orderItems.orderId, ids))
        .groupBy(orderItems.orderId)
    : [];
  const byOrder = new Map(counts.map((c) => [c.orderId, c.items]));

  return {
    rows: rows.map((row) => ({ ...row, itemCount: byOrder.get(row.id) ?? 0 })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / ORDERS_PER_PAGE)),
  };
}

/** Order detail for admin: lines carry the SKU, which the customer view omits. */
export async function getOrderForAdmin(orderId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) return undefined;

  const items = await db
    .select({
      id: orderItems.id,
      productSlug: orderItems.productSlug,
      size: orderItems.size,
      qty: orderItems.qty,
      unitPriceInr: orderItems.unitPriceInr,
      sku: variants.sku,
    })
    .from(orderItems)
    .leftJoin(variants, eq(orderItems.variantId, variants.id))
    .where(eq(orderItems.orderId, orderId));

  const audit = await db
    .select({
      id: adminAuditLog.id,
      action: adminAuditLog.action,
      meta: adminAuditLog.meta,
      createdAt: adminAuditLog.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(adminAuditLog)
    .leftJoin(users, eq(adminAuditLog.actorUserId, users.id))
    .where(
      and(eq(adminAuditLog.entity, "order"), eq(adminAuditLog.entityId, orderId)),
    )
    .orderBy(desc(adminAuditLog.createdAt));

  return { ...order, items, audit };
}

/**
 * Customers with their order aggregates.
 *
 * Only paid-or-later orders count towards spend — an abandoned 'created' row is
 * an attempt, not money, and counting it would overstate every total on the
 * page. Left join so a customer with no orders still appears.
 */
export async function listOrdersForCustomer(userId: string) {
  return db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
}

