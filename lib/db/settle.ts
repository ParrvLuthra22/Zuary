import { and, eq, gte, sql } from "drizzle-orm";

import { db } from "./index";
import { orderItems, orders, variants } from "./schema";

export type SettleResult =
  | { status: "paid"; orderId: string; alreadySettled: boolean }
  | { status: "unknown-order" }
  | { status: "oversold"; orderId: string };

/**
 * Marks an order paid and takes the stock, all or nothing.
 *
 * Shared by /checkout/verify (the fast path) and the webhook (the source of
 * truth) so the two cannot drift. Idempotent on razorpayPaymentId: whichever
 * arrives first settles, the second is a no-op.
 */
export async function settleOrderPaid(
  razorpayOrderId: string,
  razorpayPaymentId: string,
): Promise<SettleResult> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.razorpayOrderId, razorpayOrderId))
      .limit(1);

    if (!order) return { status: "unknown-order" as const };

    // Already settled — by this payment or an earlier one. Do nothing.
    if (order.status === "paid") {
      return {
        status: "paid" as const,
        orderId: order.id,
        alreadySettled: true,
      };
    }

    const lines = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    for (const line of lines) {
      // The `stock >= qty` guard makes overselling impossible even under a
      // weaker isolation level: the row simply does not update.
      const updated = await tx
        .update(variants)
        .set({ stock: sql`${variants.stock} - ${line.qty}` })
        .where(and(eq(variants.id, line.variantId), gte(variants.stock, line.qty)))
        .returning({ id: variants.id });

      if (updated.length === 0) {
        // Roll the whole thing back and leave it for a human.
        tx.rollback();
        return { status: "oversold" as const, orderId: order.id };
      }
    }

    await tx
      .update(orders)
      .set({
        status: "paid",
        razorpayPaymentId,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    return {
      status: "paid" as const,
      orderId: order.id,
      alreadySettled: false,
    };
  });
}

/** Marks a created order failed. Never downgrades one that is already paid. */
export async function markOrderFailed(
  razorpayOrderId: string,
  razorpayPaymentId?: string,
) {
  const [order] = await db
    .update(orders)
    .set({
      status: "failed",
      ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(orders.razorpayOrderId, razorpayOrderId),
        eq(orders.status, "created"),
      ),
    )
    .returning();
  return order;
}
