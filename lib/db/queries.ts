import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "./index";
import {
  orderItems,
  orders,
  products,
  variants,
  waitlist,
  type NewOrderItem,
  type OrderStatus,
  type ShippingAddress,
} from "./schema";

/* ── Catalogue ─────────────────────────────────────────────── */

export async function listActiveProducts() {
  return db.select().from(products).where(eq(products.active, true));
}

export async function getVariant(productSlug: string, size: string) {
  const [row] = await db
    .select({
      variantId: variants.id,
      stock: variants.stock,
      sku: variants.sku,
      priceInr: products.priceInr,
      productSlug: products.slug,
      size: variants.size,
    })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id))
    .where(and(eq(products.slug, productSlug), eq(variants.size, size)))
    .limit(1);
  return row;
}

/**
 * Stock per size for one product. Returns null when the database is not
 * reachable — the caller must treat that as "unknown", not as "sold out".
 */
export async function getVariantStock(
  slug: string,
): Promise<Record<string, number> | null> {
  try {
    const rows = await db
      .select({ size: variants.size, stock: variants.stock })
      .from(variants)
      .innerJoin(products, eq(variants.productId, products.id))
      .where(eq(products.slug, slug));

    if (rows.length === 0) return null;
    return Object.fromEntries(rows.map((r) => [r.size, r.stock]));
  } catch {
    return null;
  }
}

export async function getVariantsForSlugs(slugs: string[]) {
  if (slugs.length === 0) return [];
  return db
    .select({
      variantId: variants.id,
      stock: variants.stock,
      sku: variants.sku,
      priceInr: products.priceInr,
      productSlug: products.slug,
      size: variants.size,
    })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id))
    .where(inArray(products.slug, slugs));
}

/* ── Orders ────────────────────────────────────────────────── */

export async function createOrder(input: {
  email: string;
  phone: string;
  address: ShippingAddress;
  subtotalInr: number;
  shippingInr: number;
  totalInr: number;
  razorpayOrderId: string;
  items: Omit<NewOrderItem, "orderId">[];
}) {
  const [order] = await db
    .insert(orders)
    .values({
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

/** Decrements stock for each line of a paid order. Never goes below zero. */
export async function decrementStockForOrder(orderId: string) {
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  for (const item of items) {
    await db
      .update(variants)
      .set({ stock: sql`GREATEST(${variants.stock} - ${item.qty}, 0)` })
      .where(eq(variants.id, item.variantId));
  }

  return items.length;
}

/* ── Waitlist ──────────────────────────────────────────────── */

export async function addToWaitlist(email: string, source: string) {
  const [row] = await db
    .insert(waitlist)
    .values({ email, source })
    .returning();
  return row;
}
