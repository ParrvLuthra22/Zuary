import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";

import { PRODUCTS, SIZES } from "../shared/constants/products";
import { products, variants } from "../server/db/schema";

const STARTING_STOCK = 25;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env.local.");
    process.exit(1);
  }

  const db = drizzle(neon(url));

  for (const product of PRODUCTS) {
    const [row] = await db
      .insert(products)
      .values({
        slug: product.slug,
        name: product.name,
        priceInr: product.price,
        active: true,
      })
      .onConflictDoUpdate({
        target: products.slug,
        set: { name: product.name, priceInr: product.price, active: true },
      })
      .returning();

    console.log(`product  ${row.slug.padEnd(6)} #${row.id}  ₹${row.priceInr}`);

    for (const size of SIZES) {
      const sku = `ZU-${product.slug.toUpperCase()}-${size}`;
      const [variant] = await db
        .insert(variants)
        .values({
          productId: row.id,
          size,
          sku,
          stock: STARTING_STOCK,
        })
        .onConflictDoUpdate({
          target: variants.sku,
          // Re-running the seed must not silently reset live stock levels,
          // so only the linkage is refreshed here.
          set: { productId: row.id, size },
        })
        .returning();

      console.log(`  variant ${variant.sku.padEnd(16)} stock ${variant.stock}`);
    }
  }

  const count = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.active, true));

  console.log(`\nSeeded ${count.length} products, ${count.length * SIZES.length} variants.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
