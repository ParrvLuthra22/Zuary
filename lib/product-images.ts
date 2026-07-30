import "server-only";

import { asc, eq, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { BLUR } from "@/lib/data/blur";
import { getProduct } from "@/lib/data/products";
import { db } from "@/lib/db";
import { productImages } from "@/lib/db/schema";

export const IMAGES_TAG = "product-images";
export const productImagesTag = (slug: string) => `product-images:${slug}`;

export type GalleryImage = {
  id: string;
  url: string;
  alt: string;
  blurDataUrl: string | null;
  source: "static" | "blob";
  sortOrder: number;
};

/**
 * The static photography, shaped like a database row.
 *
 * Used when the productImages table is empty or unreachable — before the seed
 * has been run, or with no database at all. Without this the storefront would
 * render every product with no pictures the moment the table is missing, which
 * is a far worse failure than showing the committed set.
 */
function staticFallback(slug: string): GalleryImage[] {
  const product = getProduct(slug);
  if (!product) return [];

  return product.images.map((url, index) => {
    const match = /\/products\/([^/]+)\/(\d+)\.\w+$/.exec(url);
    const key = match ? `${match[1]}-${match[2]}` : "";
    return {
      id: `static:${slug}:${index}`,
      url,
      alt: product.imageAlts?.[index] ?? `${product.name} — view ${index + 1}`,
      blurDataUrl: BLUR[key] ?? null,
      source: "static" as const,
      sortOrder: index,
    };
  });
}

async function read(slug: string): Promise<GalleryImage[]> {
  try {
    const rows = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productSlug, slug))
      .orderBy(asc(productImages.sortOrder));

    if (rows.length === 0) return staticFallback(slug);

    return rows.map((row) => ({
      id: row.id,
      url: row.url,
      alt: row.alt,
      blurDataUrl: row.blurDataUrl,
      source: row.source,
      sortOrder: row.sortOrder,
    }));
  } catch {
    return staticFallback(slug);
  }
}

/**
 * Gallery for one product, cached and tag-revalidated.
 *
 * The tag is per slug so an upload or a reorder invalidates that product only —
 * editing REEH's gallery should not evict KOHL's from every edge node.
 */
export function getProductImages(slug: string) {
  return unstable_cache(() => read(slug), ["product-images", slug], {
    tags: [IMAGES_TAG, productImagesTag(slug)],
    revalidate: 300,
  })();
}

/**
 * Galleries for several products at once.
 *
 * The shop grid renders three cards; asking per card would be three round trips
 * that all resolve at the same moment. One query, grouped in memory.
 */
async function readMany(slugs: string[]): Promise<Record<string, GalleryImage[]>> {
  if (slugs.length === 0) return {};
  try {
    const rows = await db
      .select()
      .from(productImages)
      .where(inArray(productImages.productSlug, slugs))
      .orderBy(asc(productImages.sortOrder));

    const grouped: Record<string, GalleryImage[]> = {};
    for (const row of rows) {
      (grouped[row.productSlug] ??= []).push({
        id: row.id,
        url: row.url,
        alt: row.alt,
        blurDataUrl: row.blurDataUrl,
        source: row.source,
        sortOrder: row.sortOrder,
      });
    }
    // Anything with no rows yet falls back rather than rendering imageless.
    for (const slug of slugs) grouped[slug] ??= staticFallback(slug);
    return grouped;
  } catch {
    return Object.fromEntries(slugs.map((s) => [s, staticFallback(s)]));
  }
}

export function getProductImagesForSlugs(slugs: string[]) {
  const key = [...slugs].sort().join(",");
  return unstable_cache(() => readMany(slugs), ["product-images-many", key], {
    tags: [IMAGES_TAG, ...slugs.map(productImagesTag)],
    revalidate: 300,
  })();
}
