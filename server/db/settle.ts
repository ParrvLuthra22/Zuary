import "server-only";

import { and, eq, gte, isNull, sql } from "drizzle-orm";

import { db } from "./index";
import { orderItems, orders, variants } from "./schema";

export type SettleResult =
  | {
      status: "paid";
      orderId: string;
      alreadySettled: boolean;
      /**
       * True for exactly one caller, ever. See the claim in settleOrderPaid —
       * this is what stops the browser and the webhook both mailing a receipt.
       */
      shouldSendConfirmation: boolean;
    }
  | { status: "unknown-order" }
  | { status: "oversold"; orderId: string };

/**
 * Atomically claims the right to send this order's confirmation.
 *
 * A conditional UPDATE, not a read-then-write. Postgres defaults to READ
 * COMMITTED, so two transactions can both SELECT `confirmation_sent_at IS NULL`
 * and both decide to send. Folding the test into the UPDATE's WHERE clause
 * makes the row itself the lock: exactly one statement matches, and the other
 * returns nothing.
 *
 * Deliberately keyed on the timestamp rather than on order status. If a send
 * failed after the order was marked paid, the stamp is still null and a later
 * settle can legitimately claim it — status alone would have written that
 * customer off permanently.
 */
async function claimConfirmation(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  orderId: string,
) {
  const claimed = await tx
    .update(orders)
    .set({ confirmationSentAt: new Date() })
    .where(and(eq(orders.id, orderId), isNull(orders.confirmationSentAt)))
    .returning({ id: orders.id });
  return claimed.length > 0;
}

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

    // Already settled — by this payment or an earlier one. Take no stock, but
    // still try the email claim: a previous settle may have died before it.
    if (order.status === "paid") {
      return {
        status: "paid" as const,
        orderId: order.id,
        alreadySettled: true,
        shouldSendConfirmation: await claimConfirmation(tx, order.id),
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
      shouldSendConfirmation: await claimConfirmation(tx, order.id),
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
