import "server-only";

import { unstable_cache } from "next/cache";

import { PRODUCTS, type Product } from "@/shared/constants/products";
import { db } from "@/server/db";
import { products } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const CATALOGUE_TAG = "catalogue";
export const productTag = (slug: string) => `product:${slug}`;

/**
 * Where the catalogue comes from now.
 *
 * The database is authoritative — that is the whole point of moving these
 * fields out of lib/data/products.ts and into the admin. But the static array
 * is kept as a fallback rather than deleted, for one concrete reason:
 * generateStaticParams and the product pages run at BUILD time, so making the
 * database the only source means `next build` cannot succeed without a live
 * database. That turns a missing DATABASE_URL from "some features are inert"
 * into "nothing compiles and the storefront is down".
 *
 * So: read the database, fall back to the array, and merge per field. An admin
 * edit wins the moment it is saved; an unreachable database costs you the edits,
 * not the shop.
 */
function merge(row: typeof products.$inferSelect, base: Product): Product {
  return {
    ...base,
    // Only override where the row actually carries a value. A column left null
    // by an older insert must not blank out good static copy.
    name: row.name ?? base.name,
    price: row.priceInr ?? base.price,
    series: row.series ?? base.series,
    deva: row.deva ?? base.deva,
    devaMeaning: row.devaMeaning ?? base.devaMeaning,
    fit: row.fit ?? base.fit,
    hem: row.hem ?? base.hem,
    swatch: row.swatch ?? base.swatch,
    colour: row.colour ?? base.colour,
    fabric: row.fabric ?? base.fabric,
    weight: row.weight ?? base.weight,
    mill: row.mill ?? base.mill,
    weave: row.weave ?? base.weave,
    shrinkage: row.shrinkage ?? base.shrinkage,
    description: row.description ?? base.description,
    fabricStory: row.fabricStory ?? base.fabricStory,
    care: row.care ?? base.care,
    status: row.status ?? base.status,
    hasPhotography: row.hasPhotography ?? base.hasPhotography,
    liftedBackdrop: row.liftedBackdrop ?? base.liftedBackdrop,
    drop: row.drop ?? base.drop,
  };
}

async function readCatalogue(): Promise<Product[]> {
  try {
    const rows = await db.select().from(products);
    if (rows.length === 0) return PRODUCTS;

    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    return PRODUCTS.map((base) => {
      const row = bySlug.get(base.slug);
      return row ? merge(row, base) : base;
    });
  } catch {
    // No database, or it is down. The shop keeps working on the committed
    // catalogue — silent on purpose, because this is the expected path in
    // development and would otherwise log on every render.
    return PRODUCTS;
  }
}

/**
 * Cached catalogue read.
 *
 * Tagged so a save in the admin can revalidate exactly what changed rather than
 * dumping the whole cache.
 */
export const getCatalogue = unstable_cache(readCatalogue, ["catalogue"], {
  tags: [CATALOGUE_TAG],
  revalidate: 300,
});

export async function getCatalogueProduct(
  slug: string,
): Promise<Product | undefined> {
  const all = await getCatalogue();
  return all.find((p) => p.slug === slug);
}

/** Admin reads the raw row, not the merged view — it edits the database. */
export async function getProductRow(slug: string) {
  const [row] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  return row;
}
