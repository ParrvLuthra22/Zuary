import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";

import {
  orderItems,
  orders,
  products,
  users,
  variants,
} from "../server/db/schema";

/**
 * Fixtures for the Playwright suite.
 *
 * Ids are fixed strings rather than generated, so a spec can reference an
 * account without a lookup and a re-run overwrites rather than accumulating.
 *
 * Writes two orders the specs need and cannot easily create for themselves: a
 * paid one for the admin ship flow, and one owned by a different customer for
 * the cross-account access test. It prints their ids as the E2E_* env vars the
 * specs read.
 *
 * Safe to re-run. Refuses to touch a database that is not obviously a test one
 * unless E2E_SEED_FORCE=true — this writes rows with known ids, and doing that
 * to production would be memorable for the wrong reasons.
 */

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const looksLikeTest = /test|staging|localhost|127\.0\.0\.1|neon\.tech\/.*-dev/i.test(
  url,
);
if (!looksLikeTest && process.env.E2E_SEED_FORCE !== "true") {
  console.error(
    "DATABASE_URL does not look like a test database.\n" +
      "Point it at a test branch, or set E2E_SEED_FORCE=true if you are certain.",
  );
  process.exit(1);
}

const db = drizzle(neon(url));

const ACCOUNTS = [
  {
    id: "e2e-customer",
    email: "e2e-customer@zuary.test",
    name: "E2E Customer",
    role: "customer" as const,
  },
  {
    id: "e2e-other",
    email: "e2e-other@zuary.test",
    name: "E2E Other",
    role: "customer" as const,
  },
  {
    id: "e2e-admin",
    email: "e2e-admin@zuary.test",
    name: "E2E Admin",
    role: "admin" as const,
  },
];

const ADDRESS = {
  name: "E2E Customer",
  line1: "12 Example Road",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560001",
  country: "India",
};

async function main() {
  for (const account of ACCOUNTS) {
    await db
      .insert(users)
      .values({ ...account, emailVerified: new Date() })
      .onConflictDoUpdate({
        target: users.id,
        set: { email: account.email, name: account.name, role: account.role },
      });
  }
  console.log(`users: ${ACCOUNTS.length} upserted`);

  // A variant to hang the order lines off. Whichever KOHL variant exists.
  const [variant] = await db
    .select({ id: variants.id, size: variants.size, price: products.priceInr })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id))
    .where(eq(products.slug, "kohl"))
    .limit(1);

  if (!variant) {
    console.error("No KOHL variants found — run `npm run db:seed` first.");
    process.exit(1);
  }

  async function makeOrder(userId: string, status: "paid" | "created") {
    const subtotal = variant.price;
    const shipping = subtotal >= 2000 ? 0 : 99;
    const [row] = await db
      .insert(orders)
      .values({
        userId,
        status,
        email: `${userId}@zuary.test`,
        phone: "9876543210",
        addressJson: ADDRESS,
        subtotalInr: subtotal,
        shippingInr: shipping,
        totalInr: subtotal + shipping,
        razorpayOrderId: `order_E2E_${userId}_${Date.now()}`,
      })
      .returning({ id: orders.id });

    await db.insert(orderItems).values({
      orderId: row.id,
      variantId: variant.id,
      productSlug: "kohl",
      size: variant.size,
      qty: 1,
      unitPriceInr: subtotal,
    });

    return row.id;
  }

  const paid = await makeOrder("e2e-customer", "paid");
  const foreign = await makeOrder("e2e-other", "paid");

  console.log("\nExport these before running the suite:\n");
  console.log(`  export E2E_PAID_ORDER_ID=${paid}`);
  console.log(`  export E2E_FOREIGN_ORDER_ID=${foreign}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
