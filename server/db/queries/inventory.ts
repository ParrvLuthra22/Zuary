import "server-only";

import {
  asc,
  eq,
  sql,
} from "drizzle-orm";

import { getProduct, type Size } from "@/shared/constants/products";
import { shippingFor } from "@/shared/constants/policies";
import { db } from "@/server/db";
import { getVariantsForSlugs } from "./products";
import type {
  CartLineInput,
  CartValidation,
  ValidatedLine,
} from "./types";
import {
  orderItems,
  products,
  variants,
} from "@/server/db/schema";

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

/* ── Stock grid (admin) ────────────────────────────────────── */

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
