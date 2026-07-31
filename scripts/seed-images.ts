import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";

import { BLUR } from "../shared/constants/blur";
import { PRODUCTS } from "../shared/constants/products";
import { productImages } from "../server/db/schema";

/**
 * Seeds productImages from the committed static photography.
 *
 * After this, the app reads images from one place regardless of where the file
 * physically lives: /public paths seeded here as source 'static', and admin
 * uploads inserted as source 'blob'. No component has to know the difference.
 *
 * Idempotent — matched on (productSlug, url), so re-running updates alt text
 * and sort order rather than duplicating rows. That matters because the alt
 * text is edited in the admin and a careless re-run should not silently
 * multiply the gallery.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env.local.");
    process.exit(1);
  }

  const db = drizzle(neon(url));
  let inserted = 0;
  let updated = 0;

  for (const product of PRODUCTS) {
    for (const [index, path] of product.images.entries()) {
      // `/products/reeh/03.webp` -> `reeh-03`, the key blur.ts uses.
      const match = /\/products\/([^/]+)\/(\d+)\.\w+$/.exec(path);
      const blurKey = match ? `${match[1]}-${match[2]}` : undefined;

      const row = {
        productSlug: product.slug,
        url: path,
        source: "static" as const,
        alt: product.imageAlts?.[index] ?? `${product.name} — view ${index + 1}`,
        blurDataUrl: blurKey ? (BLUR[blurKey] ?? null) : null,
        sortOrder: index,
      };

      const [existing] = await db
        .select({ id: productImages.id })
        .from(productImages)
        .where(
          and(
            eq(productImages.productSlug, product.slug),
            eq(productImages.url, path),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .update(productImages)
          .set({ alt: row.alt, blurDataUrl: row.blurDataUrl, sortOrder: row.sortOrder })
          .where(eq(productImages.id, existing.id));
        updated += 1;
        console.log(`  update ${path}`);
      } else {
        await db.insert(productImages).values(row);
        inserted += 1;
        console.log(`  insert ${path}`);
      }
    }
  }

  console.log(`\nSeeded product images: ${inserted} inserted, ${updated} updated.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
