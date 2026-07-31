import "server-only";

import {
  and,
  asc,
  count,
  eq,
  inArray,
  sql,
} from "drizzle-orm";

import { db } from "@/server/db";
import {
  productImages,
  products,
  variants,
} from "@/server/db/schema";

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

/* ── Products & stock (admin) ──────────────────────────────── */

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
