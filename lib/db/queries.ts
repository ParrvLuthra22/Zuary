import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { getProduct, type Size } from "@/lib/data/products";
import { shippingFor } from "@/lib/data/policies";

import { db } from "./index";
import {
  addresses,
  orderItems,
  orders,
  products,
  users,
  variants,
  waitlist,
  wishlist,
  type NewAddress,
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

/* ── Account: orders ───────────────────────────────────────── */

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

/* ── Account: addresses ────────────────────────────────────── */

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
