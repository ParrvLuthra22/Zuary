import "server-only";

import { and, eq, gte, inArray, sql } from "drizzle-orm";

import { db, type Tx } from "@/server/db";
import { getVariantStock, listStockGrid } from "@/server/db/queries";
import { products, variants } from "@/server/db/schema";
import { NotFoundError, OutOfStockError, ValidationError } from "@/shared/errors";
import { auditLog } from "./admin.service";

/** Stock ceiling. A four-digit cap catches a mis-keyed extra zero. */
const MAX_STOCK = 9999;

/**
 * Stock per size for one product.
 *
 * Returns null when the database is unreachable — the caller must treat that as
 * "unknown", never as "sold out". Showing every size greyed out because of a
 * connection blip loses real orders.
 */
export function getStock(slug: string) {
  return getVariantStock(slug);
}

/** Every variant, for the admin stock grid. */
export function getStockMap() {
  return listStockGrid();
}

/**
 * Sets an absolute stock figure for one variant.
 *
 * Absolute rather than a delta because that is what the admin grid shows and
 * what a stock count produces — someone counting a shelf knows there are 12,
 * not that there are three more than last time.
 */
export async function setStock(input: {
  variantId: number;
  qty: number;
  actorUserId: string;
}) {
  if (!Number.isFinite(input.qty) || input.qty < 0 || input.qty > MAX_STOCK) {
    throw new ValidationError(`Stock must be between 0 and ${MAX_STOCK}.`);
  }
  const qty = Math.floor(input.qty);

  return db.transaction(async (tx) => {
    const [before] = await tx
      .select({ stock: variants.stock, sku: variants.sku })
      .from(variants)
      .where(eq(variants.id, input.variantId))
      .limit(1);

    if (!before) throw new NotFoundError("No such variant.");

    await tx
      .update(variants)
      .set({ stock: qty })
      .where(eq(variants.id, input.variantId));

    await auditLog(
      {
        actorUserId: input.actorUserId,
        action: "stock.update",
        entity: "variant",
        entityId: String(input.variantId),
        // Before and after, so a mis-keyed number can be traced and undone.
        meta: { sku: before.sku, before: before.stock, after: qty },
      },
      tx,
    );

    return { variantId: input.variantId, before: before.stock, after: qty };
  });
}

/**
 * Takes stock for a paid order's lines. Must be given a transaction.
 *
 * Called only by orders.service during a settle, and it takes `tx` rather than
 * opening its own precisely so it cannot be called any other way — decrementing
 * stock outside the transaction that marks the order paid is how you end up
 * having taken the stock for an order that then rolled back.
 *
 * The `stock >= qty` guard lives in the UPDATE's WHERE clause. That is what
 * makes overselling impossible even under READ COMMITTED: a row that no longer
 * has the stock simply does not match, and no amount of concurrent traffic can
 * drive it negative. Checking first and updating after would leave a window
 * between the two where both callers pass.
 */
export async function decrementStock(
  tx: Tx,
  items: { variantId: number; qty: number }[],
): Promise<void> {
  for (const line of items) {
    const updated = await tx
      .update(variants)
      .set({ stock: sql`${variants.stock} - ${line.qty}` })
      .where(and(eq(variants.id, line.variantId), gte(variants.stock, line.qty)))
      .returning({ id: variants.id });

    if (updated.length === 0) {
      throw new OutOfStockError(
        "Payment received but stock ran out. Support will be in touch.",
      );
    }
  }
}

/**
 * Prices and stock straight from the database for a set of slugs.
 *
 * The only place checkout is allowed to learn what something costs. Everything
 * the browser sent about money is discarded before this runs.
 */
export async function getPricedVariants(slugs: string[]) {
  if (slugs.length === 0) return [];
  return db
    .select({
      variantId: variants.id,
      stock: variants.stock,
      priceInr: products.priceInr,
      productSlug: products.slug,
      size: variants.size,
      active: products.active,
    })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id))
    .where(inArray(products.slug, slugs));
}
