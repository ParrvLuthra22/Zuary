import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db, type Tx } from "@/server/db";
import {
  getOrderForUser,
  listOrdersForUser,
  getOrderForAdmin,
} from "@/server/db/queries";
import { orderItems, orders, type ShippingAddress } from "@/server/db/schema";
import { shippingFor } from "@/shared/constants/policies";
import { trackingUrlFor } from "@/shared/constants/couriers";
import { shortOrderId } from "@/shared/utils/order-number";
import {
  NotFoundError,
  OutOfStockError,
  PaymentError,
  ValidationError,
} from "@/shared/errors";
import { auditLog } from "./admin.service";
import { decrementStock, getPricedVariants } from "./inventory.service";
import {
  RAZORPAY_CURRENCY,
  razorpay,
  toPaise,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "./payments.service";

/**
 * Everything that happens to an order.
 *
 * Framework-agnostic by contract: no Request, no Response, no cookies(), no
 * headers(), no redirect(). Callers pass a userId; this file never asks where
 * it came from. That is what lets an API route, a server action and a future
 * mobile endpoint all land here.
 */

export type CartLine = { slug: string; size: string; qty: number };

export type CreateOrderResult = {
  orderId: string;
  razorpayOrderId: string;
  /** Paise, as Razorpay reports it — the browser hands this straight back. */
  amount: number;
  currency: string;
};

/**
 * Prices a cart from the database and opens an order against it.
 *
 * Every figure is recomputed here. `unitPriceInr` from the caller is read only
 * to be ignored: the browser owns the cart, and a cart is a request, not a
 * quote. This is the tamper boundary for the whole checkout.
 */
export async function createOrder(input: {
  userId: string;
  items: CartLine[];
  address: ShippingAddress;
  contact: { email: string; phone: string };
}): Promise<CreateOrderResult> {
  if (input.items.length === 0) {
    throw new ValidationError("Your cart is empty.");
  }

  const slugs = [...new Set(input.items.map((i) => i.slug))];
  const rows = await getPricedVariants(slugs);

  const key = (slug: string, size: string) => `${slug}:${size}`;
  const byVariant = new Map(rows.map((r) => [key(r.productSlug, r.size), r]));

  const priced = input.items.map((item) => {
    const variant = byVariant.get(key(item.slug, item.size));

    if (!variant || !variant.active) {
      throw new OutOfStockError(
        `${item.slug.toUpperCase()} ${item.size} is not available.`,
      );
    }
    if (variant.stock < item.qty) {
      throw new OutOfStockError(
        `${item.slug.toUpperCase()} ${item.size}: only ${variant.stock} left.`,
      );
    }

    return {
      variantId: variant.variantId,
      productSlug: item.slug,
      size: item.size,
      qty: item.qty,
      // From the database. Never from the caller.
      unitPriceInr: variant.priceInr,
    };
  });

  const subtotalInr = priced.reduce((sum, l) => sum + l.unitPriceInr * l.qty, 0);
  const shippingInr = shippingFor(subtotalInr);
  const totalInr = subtotalInr + shippingInr;

  /*
   * Our row first, so the Razorpay receipt can carry our id, then the provider
   * call, then the lines and the razorpayOrderId in one transaction.
   *
   * The provider call cannot be inside the transaction: it is a network round
   * trip to a third party, and holding a Postgres transaction open across one
   * ties up a pooled connection for as long as Razorpay feels like taking. If
   * it fails, the order stays 'created' with a null razorpayOrderId, which is
   * exactly what an abandoned checkout looks like — no reconciliation needed.
   */
  const [order] = await db
    .insert(orders)
    .values({
      userId: input.userId,
      status: "created",
      email: input.contact.email,
      phone: input.contact.phone,
      addressJson: input.address,
      subtotalInr,
      shippingInr,
      totalInr,
    })
    .returning();

  let rzpOrder;
  try {
    rzpOrder = await razorpay().orders.create({
      amount: toPaise(totalInr),
      currency: RAZORPAY_CURRENCY,
      receipt: order.id,
      notes: { ourOrderId: order.id, email: input.contact.email },
    });
  } catch (error) {
    // Razorpay's own message names internal fields and is written for
    // developers, so it is logged and not repeated to the customer.
    throw new PaymentError("Could not start the payment. Try again.", {
      cause: error,
    });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ razorpayOrderId: rzpOrder.id, updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    await tx.insert(orderItems).values(
      priced.map((line) => ({
        orderId: order.id,
        variantId: line.variantId,
        productSlug: line.productSlug,
        size: line.size,
        qty: line.qty,
        unitPriceInr: line.unitPriceInr,
      })),
    );
  });

  return {
    orderId: order.id,
    razorpayOrderId: rzpOrder.id,
    amount: Number(rzpOrder.amount),
    currency: rzpOrder.currency ?? RAZORPAY_CURRENCY,
  };
}

/**
 * Atomically claims the right to send this order's confirmation.
 *
 * A conditional UPDATE, not a read-then-write. Postgres defaults to READ
 * COMMITTED, so two transactions can both see `confirmation_sent_at IS NULL`
 * and both decide to send. Folding the test into the WHERE clause makes the row
 * itself the lock: exactly one statement matches, the other returns nothing.
 *
 * Keyed on the timestamp rather than on order status, deliberately. If a send
 * failed after the order was marked paid, the stamp is still null and a later
 * settle can legitimately claim it — keying on status would write that customer
 * off permanently.
 */
async function claimConfirmation(tx: Tx, orderId: string): Promise<boolean> {
  const claimed = await tx
    .update(orders)
    .set({ confirmationSentAt: new Date() })
    .where(and(eq(orders.id, orderId), isNull(orders.confirmationSentAt)))
    .returning({ id: orders.id });
  return claimed.length > 0;
}

export type SettleResult = {
  orderId: string;
  status: "paid";
  /** False when an earlier call had already settled it. */
  firstSettle: boolean;
  /** True for exactly one caller, ever. Gate the confirmation email on it. */
  shouldSendConfirmation: boolean;
};

/**
 * Marks an order paid and takes the stock, all or nothing.
 *
 * The single settle path, shared by the browser handoff and the webhook so the
 * two cannot drift. Idempotent: whichever arrives first does the work, the
 * second finds it already paid, takes no stock, and returns firstSettle false.
 */
async function settle(
  razorpayOrderId: string,
  razorpayPaymentId: string,
): Promise<SettleResult> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.razorpayOrderId, razorpayOrderId))
      .limit(1);

    if (!order) throw new NotFoundError("Unknown order.");

    // Already settled — by this payment or an earlier one. Take no stock, but
    // still try the email claim: a previous settle may have died before it.
    if (order.status === "paid") {
      return {
        orderId: order.id,
        status: "paid" as const,
        firstSettle: false,
        shouldSendConfirmation: await claimConfirmation(tx, order.id),
      };
    }

    const lines = await tx
      .select({ variantId: orderItems.variantId, qty: orderItems.qty })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    // Throws OutOfStockError, which rolls the transaction back — the order does
    // not go to paid and the stock is not taken. Money has moved, so this needs
    // a human; the caller surfaces it as a 409, not a generic failure.
    await decrementStock(tx, lines);

    await tx
      .update(orders)
      .set({ status: "paid", razorpayPaymentId, updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    return {
      orderId: order.id,
      status: "paid" as const,
      firstSettle: true,
      shouldSendConfirmation: await claimConfirmation(tx, order.id),
    };
  });
}

/** Marks a created order failed. Never downgrades one that is already paid. */
async function markFailed(razorpayOrderId: string, razorpayPaymentId?: string) {
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

/**
 * The browser's post-payment handoff.
 *
 * Ownership is checked before the signature, and that order is the fix for a
 * real hole rather than a stylistic choice. A signature mismatch fails the
 * order, so while the signature ran first any anonymous caller who knew a
 * pending razorpayOrderId could POST a junk signature and fail someone else's
 * order out from under them before the webhook landed. Behind the ownership
 * check the worst anyone can do is fail their own.
 *
 * Being strict here is safe because this is not the source of truth — the
 * webhook settles the same order server-to-server. A refusal costs the caller a
 * confirmation response, never a paid order.
 */
export async function verifyPayment(input: {
  orderId?: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
  userId: string;
}): Promise<SettleResult> {
  const [owner] = await db
    .select({ id: orders.id, userId: orders.userId })
    .from(orders)
    .where(eq(orders.razorpayOrderId, input.razorpayOrderId))
    .limit(1);

  // Same answer for "not yours" and "does not exist", so probing tells the
  // caller nothing.
  if (!owner || owner.userId !== input.userId) {
    if (owner) {
      console.error(
        "[orders.verifyPayment] session does not own order",
        input.razorpayOrderId,
      );
    }
    throw new NotFoundError("Unknown order.");
  }

  const signatureOk = verifyPaymentSignature({
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    signature: input.signature,
  });

  if (!signatureOk) {
    await markFailed(input.razorpayOrderId).catch(() => {});
    throw new PaymentError("That payment could not be verified.");
  }

  return settle(input.razorpayOrderId, input.razorpayPaymentId);
}

export type WebhookResult =
  | { handled: "paid"; orderId: string; firstSettle: boolean; shouldSendConfirmation: boolean }
  | { handled: "failed"; razorpayOrderId: string }
  | { handled: "ignored"; event: string };

/**
 * The source of truth for payment state.
 *
 * Takes the raw body, not a parsed object: the HMAC is over the exact bytes
 * received, and re-serialising JSON changes them so the signature would never
 * match. Idempotent by way of settle() — Razorpay retries, and a retry of a
 * payment already settled takes no stock and sends no second email.
 */
export async function handleWebhook(input: {
  rawBody: string;
  signature: string | null;
}): Promise<WebhookResult> {
  if (!input.signature || !verifyWebhookSignature(input.rawBody, input.signature)) {
    throw new PaymentError("Signature mismatch.");
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
  };
  try {
    event = JSON.parse(input.rawBody);
  } catch (error) {
    throw new ValidationError("Malformed payload.", { cause: error });
  }

  const entity = event.payload?.payment?.entity;
  const razorpayOrderId = entity?.order_id;
  const razorpayPaymentId = entity?.id;
  const name = event.event ?? "unknown";

  // Signature was good, so acknowledge rather than make Razorpay retry forever.
  if (!razorpayOrderId || !razorpayPaymentId) {
    return { handled: "ignored", event: name };
  }

  switch (name) {
    case "payment.captured": {
      const result = await settle(razorpayOrderId, razorpayPaymentId);
      return {
        handled: "paid",
        orderId: result.orderId,
        firstSettle: result.firstSettle,
        shouldSendConfirmation: result.shouldSendConfirmation,
      };
    }
    case "payment.failed": {
      await markFailed(razorpayOrderId, razorpayPaymentId);
      return { handled: "failed", razorpayOrderId };
    }
    default:
      return { handled: "ignored", event: name };
  }
}

/**
 * Marks an order shipped and records the courier reference.
 *
 * Guarded on `status = 'paid'` in the UPDATE itself, which is what makes a
 * double-submit safe: the second call matches no row and exits before the
 * email, so nobody is told twice that the same parcel left. Checking the status
 * first and updating after leaves a window where both calls pass.
 */
export async function markShipped(input: {
  orderId: string;
  courier: string;
  awb: string;
  trackingUrl?: string | null;
  actorUserId: string;
}) {
  // Rebuilt server-side. What the client sent is a convenience, not a fact —
  // and an admin-supplied URL is used only for couriers we have no pattern for.
  const derived = trackingUrlFor(input.courier, input.awb);
  const trackingUrl = derived ?? (input.trackingUrl || null);

  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(orders)
      .set({
        status: "shipped",
        courier: input.courier,
        trackingNumber: input.awb,
        trackingUrl,
        shippedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, input.orderId), eq(orders.status, "paid")))
      .returning();

    if (!row) {
      throw new ValidationError(
        "That order is not awaiting shipment — reload the list.",
      );
    }

    await auditLog(
      {
        actorUserId: input.actorUserId,
        action: "order.ship",
        entity: "order",
        entityId: input.orderId,
        meta: { courier: input.courier, awb: input.awb, trackingUrl },
      },
      tx,
    );

    return row;
  });
}

/** Only something already shipped can be delivered. */
export async function markDelivered(input: {
  orderId: string;
  actorUserId: string;
}) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(orders)
      .set({ status: "delivered", updatedAt: new Date() })
      .where(and(eq(orders.id, input.orderId), eq(orders.status, "shipped")))
      .returning();

    if (!row) throw new ValidationError("That order has not shipped yet.");

    await auditLog(
      {
        actorUserId: input.actorUserId,
        action: "order.deliver",
        entity: "order",
        entityId: input.orderId,
      },
      tx,
    );

    return row;
  });
}

/**
 * Cancels an order.
 *
 * `confirmOrderNumber` is re-checked here, not only in the dialog that collects
 * it. A confirmation the client alone enforces is decoration, and this is the
 * destructive action on the page.
 *
 * Stock is deliberately NOT returned to the shelf. Whether the units go back
 * depends on where the parcel physically is, and guessing wrong oversells the
 * next customer. The returns flow owns that decision.
 */
export async function cancelOrder(input: {
  orderId: string;
  actorUserId: string;
  reason?: string;
  /** The order number the admin typed, as proof of intent. */
  confirmOrderNumber?: string;
}) {
  if (
    input.confirmOrderNumber !== undefined &&
    input.confirmOrderNumber.trim().toUpperCase() !== shortOrderId(input.orderId)
  ) {
    throw new ValidationError("Order number does not match.");
  }

  return db.transaction(async (tx) => {
    const [before] = await tx
      .select({ status: orders.status, totalInr: orders.totalInr })
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1);

    if (!before) throw new NotFoundError("No such order.");

    const [row] = await tx
      .update(orders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(orders.id, input.orderId))
      .returning();

    await auditLog(
      {
        actorUserId: input.actorUserId,
        action: "order.cancel",
        entity: "order",
        entityId: input.orderId,
        meta: {
          previousStatus: before.status,
          refundInr: before.totalInr,
          reason: input.reason ?? null,
        },
      },
      tx,
    );

    return row;
  });
}

/* ── Reads ─────────────────────────────────────────────────── */

export function getOrdersForUser(userId: string) {
  return listOrdersForUser(userId);
}

/**
 * One order, scoped to its owner.
 *
 * Ownership is in the query's WHERE clause rather than a check on the result,
 * so another customer's id and one that does not exist are indistinguishable
 * from out here — and from the caller's point of view both are NotFound.
 */
export async function getOrderById(orderId: string, userId: string) {
  const order = await getOrderForUser(orderId, userId);
  if (!order) throw new NotFoundError("No such order.");
  return order;
}

/** Unscoped read, for admin surfaces only. Callers must gate with requireAdmin. */
export async function getOrderForAdminById(orderId: string) {
  const order = await getOrderForAdmin(orderId);
  if (!order) throw new NotFoundError("No such order.");
  return order;
}
