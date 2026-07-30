import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  sum,
} from "drizzle-orm";

import { db } from "./index";
import {
  adminAuditLog,
  orderItems,
  orders,
  productImages,
  products,
  users,
  variants,
  waitlist,
  type OrderStatus,
} from "./schema";

export const ORDERS_PER_PAGE = 50;

/**
 * The filter names the admins use, mapped to what they mean in the data.
 *
 * "unshipped" is the working queue and is not a status — it is paid-and-not-yet
 * -handed-over, which is exactly the list someone stands at the packing table
 * with. Everything else is a plain status match.
 */
export type OrderFilter =
  | "all"
  | "unshipped"
  | "shipped"
  | "delivered"
  | "failed"
  | "cancelled";

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

export type CustomerSort = "spent" | "orders" | "joined";

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

export async function listOrdersForCustomer(userId: string) {
  return db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
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

/* ── Products & stock ──────────────────────────────────────── */

/**
 * Product rows with their image count and total stock.
 *
 * Two grouped side queries rather than joins: joining products to both
 * variants and productImages at once multiplies the rows and every aggregate
 * comes out wrong (a classic fan-out). Cheaper and correct to group each
 * separately and stitch in memory.
 */
export async function listProductsForAdmin() {
  const rows = await db.select().from(products).orderBy(asc(products.slug));

  const stock = await db
    .select({
      productId: variants.productId,
      total: sql<number>`coalesce(sum(${variants.stock}), 0)::int`,
    })
    .from(variants)
    .groupBy(variants.productId);

  const images = await db
    .select({
      productSlug: productImages.productSlug,
      count: count(),
    })
    .from(productImages)
    .groupBy(productImages.productSlug);

  const stockBy = new Map(stock.map((s) => [s.productId, s.total]));
  const imagesBy = new Map(images.map((i) => [i.productSlug, i.count]));

  return rows.map((row) => ({
    ...row,
    totalStock: stockBy.get(row.id) ?? 0,
    imageCount: imagesBy.get(row.slug) ?? 0,
  }));
}

export async function listImagesForAdmin(slug: string) {
  return db
    .select()
    .from(productImages)
    .where(eq(productImages.productSlug, slug))
    .orderBy(asc(productImages.sortOrder));
}

/** Every variant, grouped for the stock grid. */
export async function listStockGrid() {
  return db
    .select({
      variantId: variants.id,
      productId: products.id,
      productSlug: products.slug,
      productName: products.name,
      size: variants.size,
      sku: variants.sku,
      stock: variants.stock,
    })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id))
    .orderBy(asc(products.slug), asc(variants.size));
}
