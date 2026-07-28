import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { getProduct, type Size } from "@/lib/data/products";
import { shippingFor } from "@/lib/data/policies";

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

/* ── Cart validation ───────────────────────────────────────── */

export type CartLineInput = {
  slug: string;
  size: string;
  qty: number;
  /** What the browser thinks this costs. Checked, never trusted. */
  unitPriceInr?: number;
};

export type ValidatedLine = {
  slug: string;
  size: string;
  requestedQty: number;
  /** Requested qty clamped to what is actually on the shelf. */
  qty: number;
  unitPriceInr: number;
  lineTotalInr: number;
  stock: number | null;
  available: boolean;
  issues: ("unavailable" | "price-changed" | "qty-reduced")[];
};

export type CartValidation = {
  lines: ValidatedLine[];
  subtotalInr: number;
  shippingInr: number;
  totalInr: number;
  /** True when anything the browser sent had to be corrected. */
  changed: boolean;
  /** False when there is no database — stock is then unknown, not zero. */
  stockKnown: boolean;
};

/**
 * Re-prices and re-checks a cart on the server.
 *
 * Price comes from the catalogue, which is server-side and cannot be edited by
 * a visitor; the database is preferred when it is reachable so a price change
 * there wins. Stock comes from the database only — with no database the stock
 * is unknown and lines are left alone rather than being wrongly emptied.
 */
export async function validateCart(
  items: CartLineInput[],
): Promise<CartValidation> {
  const slugs = [...new Set(items.map((i) => i.slug))];

  let rows: Awaited<ReturnType<typeof getVariantsForSlugs>> = [];
  let stockKnown = false;
  try {
    rows = await getVariantsForSlugs(slugs);
    stockKnown = rows.length > 0;
  } catch {
    stockKnown = false;
  }

  const key = (slug: string, size: string) => `${slug}:${size}`;
  const byVariant = new Map(rows.map((r) => [key(r.productSlug, r.size), r]));

  const lines: ValidatedLine[] = items.flatMap((item) => {
    const product = getProduct(item.slug);
    const variant = byVariant.get(key(item.slug, item.size));
    const issues: ValidatedLine["issues"] = [];

    // Not in the catalogue at all, or a size this product is not cut in.
    if (!product || !product.sizes.includes(item.size as Size)) {
      return [
        {
          slug: item.slug,
          size: item.size,
          requestedQty: item.qty,
          qty: 0,
          unitPriceInr: 0,
          lineTotalInr: 0,
          stock: 0,
          available: false,
          issues: ["unavailable"],
        },
      ];
    }

    const unitPriceInr = variant?.priceInr ?? product.price;
    if (
      item.unitPriceInr !== undefined &&
      item.unitPriceInr !== unitPriceInr
    ) {
      issues.push("price-changed");
    }

    const stock = stockKnown ? (variant?.stock ?? 0) : null;
    let qty = item.qty;

    if (stock !== null && qty > stock) {
      qty = Math.max(0, stock);
      issues.push(qty === 0 ? "unavailable" : "qty-reduced");
    }

    return [
      {
        slug: item.slug,
        size: item.size,
        requestedQty: item.qty,
        qty,
        unitPriceInr,
        lineTotalInr: unitPriceInr * qty,
        stock,
        available: qty > 0,
        issues,
      },
    ];
  });

  const subtotalInr = lines.reduce((sum, l) => sum + l.lineTotalInr, 0);
  const shippingInr = shippingFor(subtotalInr);

  return {
    lines,
    subtotalInr,
    shippingInr,
    totalInr: subtotalInr + shippingInr,
    changed: lines.some((l) => l.issues.length > 0),
    stockKnown,
  };
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
