import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  NotFoundError,
  OutOfStockError,
  PaymentError,
  ValidationError,
} from "@/shared/errors";
import { makeDb, queue, type DbStub } from "./harness";

const db = vi.hoisted(() => ({ current: null as unknown as DbStub }));
const verifyPaymentSignature = vi.hoisted(() => vi.fn());
const verifyWebhookSignature = vi.hoisted(() => vi.fn());
const decrementStock = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  get db() {
    return db.current;
  },
  getDb: () => db.current,
}));

vi.mock("@/server/services/inventory.service", () => ({
  decrementStock,
  getPricedVariants: vi.fn(),
}));

vi.mock("@/server/services/payments.service", () => ({
  verifyPaymentSignature,
  verifyWebhookSignature,
  razorpay: () => ({ orders: { create: vi.fn() } }),
  toPaise: (r: number) => Math.round(r * 100),
  RAZORPAY_CURRENCY: "INR",
}));

const { verifyPayment, handleWebhook } = await import(
  "@/server/services/orders.service"
);

const RZP_ORDER = "order_RZP1";
const RZP_PAYMENT = "pay_RZP1";

beforeEach(() => {
  vi.clearAllMocks();
  db.current = makeDb();
  decrementStock.mockResolvedValue(undefined);
});

/* ── verifyPayment ──────────────────────────────────────────────────────── */

describe("verifyPayment", () => {
  function ownedByU1() {
    queue(db.current.select, [{ id: "o1", userId: "u1" }]);
  }

  it("rejects a bad signature", async () => {
    ownedByU1();
    verifyPaymentSignature.mockReturnValue(false);

    await expect(
      verifyPayment({
        razorpayOrderId: RZP_ORDER,
        razorpayPaymentId: RZP_PAYMENT,
        signature: "forged",
        userId: "u1",
      }),
    ).rejects.toBeInstanceOf(PaymentError);

    // A rejected signature must not settle anything.
    expect(decrementStock).not.toHaveBeenCalled();
  });

  it("marks the order failed when the signature is bad", async () => {
    ownedByU1();
    verifyPaymentSignature.mockReturnValue(false);

    await verifyPayment({
      razorpayOrderId: RZP_ORDER,
      razorpayPaymentId: RZP_PAYMENT,
      signature: "forged",
      userId: "u1",
    }).catch(() => {});

    expect(db.current.update).toHaveBeenCalled();
  });

  it("refuses an order belonging to someone else", async () => {
    queue(db.current.select, [{ id: "o1", userId: "someone-else" }]);

    await expect(
      verifyPayment({
        razorpayOrderId: RZP_ORDER,
        razorpayPaymentId: RZP_PAYMENT,
        signature: "valid",
        userId: "u1",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    /*
     * The signature is never even checked for an order the caller does not
     * own. That ordering is the fix for a real hole: a mismatch fails the
     * order, so with the signature first, anyone knowing a pending
     * razorpayOrderId could fail someone else's order before the webhook
     * landed.
     */
    expect(verifyPaymentSignature).not.toHaveBeenCalled();
  });

  it("gives the same answer for an unknown order as for someone else's", async () => {
    queue(db.current.select, []);
    const unknown = await verifyPayment({
      razorpayOrderId: RZP_ORDER,
      razorpayPaymentId: RZP_PAYMENT,
      signature: "valid",
      userId: "u1",
    }).catch((e) => e);

    queue(db.current.select, [{ id: "o1", userId: "other" }]);
    const theirs = await verifyPayment({
      razorpayOrderId: RZP_ORDER,
      razorpayPaymentId: RZP_PAYMENT,
      signature: "valid",
      userId: "u1",
    }).catch((e) => e);

    expect(unknown.message).toBe(theirs.message);
    expect(unknown.status).toBe(theirs.status);
  });

  it("settles a good signature and claims the confirmation once", async () => {
    ownedByU1();
    verifyPaymentSignature.mockReturnValue(true);
    // settle(): select the order (created), then the lines, then the claim.
    queue(
      db.current.select,
      [{ id: "o1", status: "created", razorpayOrderId: RZP_ORDER }],
      [{ variantId: 1, qty: 1 }],
    );
    queue(db.current.update, [], [{ id: "o1" }]);

    const result = await verifyPayment({
      razorpayOrderId: RZP_ORDER,
      razorpayPaymentId: RZP_PAYMENT,
      signature: "valid",
      userId: "u1",
    });

    expect(result.status).toBe("paid");
    expect(result.firstSettle).toBe(true);
    expect(decrementStock).toHaveBeenCalledOnce();
  });
});

/* ── handleWebhook ──────────────────────────────────────────────────────── */

describe("handleWebhook", () => {
  const captured = JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: RZP_PAYMENT, order_id: RZP_ORDER } } },
  });

  it("rejects a missing signature without parsing the body", async () => {
    await expect(
      handleWebhook({ rawBody: captured, signature: null }),
    ).rejects.toBeInstanceOf(PaymentError);
    expect(verifyWebhookSignature).not.toHaveBeenCalled();
  });

  it("rejects a bad signature", async () => {
    verifyWebhookSignature.mockReturnValue(false);
    await expect(
      handleWebhook({ rawBody: captured, signature: "forged" }),
    ).rejects.toBeInstanceOf(PaymentError);
  });

  it("rejects a malformed body behind a good signature", async () => {
    verifyWebhookSignature.mockReturnValue(true);
    await expect(
      handleWebhook({ rawBody: "{not json", signature: "ok" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("ignores an event it does not handle, without erroring", async () => {
    verifyWebhookSignature.mockReturnValue(true);
    const result = await handleWebhook({
      rawBody: JSON.stringify({ event: "refund.created", payload: {} }),
      signature: "ok",
    });
    expect(result).toEqual({ handled: "ignored", event: "refund.created" });
  });

  /**
   * The idempotency test the brief asks for.
   *
   * Razorpay retries, and /checkout/verify races the webhook, so the same
   * capture arrives twice. The second must take no stock and must not claim
   * the confirmation a second time — otherwise the customer is billed once
   * and mailed twice, and the shelf is decremented twice for one order.
   */
  it("is idempotent: a repeat capture takes no stock and sends no second email", async () => {
    verifyWebhookSignature.mockReturnValue(true);

    // First delivery: order is 'created', so it settles.
    queue(
      db.current.select,
      [{ id: "o1", status: "created", razorpayOrderId: RZP_ORDER }],
      [{ variantId: 1, qty: 2 }],
    );
    queue(db.current.update, [], [{ id: "o1" }]); // status write, then the claim wins
    const first = await handleWebhook({ rawBody: captured, signature: "ok" });

    expect(first).toMatchObject({
      handled: "paid",
      firstSettle: true,
      shouldSendConfirmation: true,
    });
    expect(decrementStock).toHaveBeenCalledOnce();

    // Second delivery: the row now reads 'paid', and the conditional claim
    // matches nothing because confirmation_sent_at is set.
    decrementStock.mockClear();
    db.current = makeDb();
    queue(db.current.select, [
      { id: "o1", status: "paid", razorpayOrderId: RZP_ORDER },
    ]);
    queue(db.current.update, []); // claim returns no rows

    const second = await handleWebhook({ rawBody: captured, signature: "ok" });

    expect(second).toMatchObject({
      handled: "paid",
      firstSettle: false,
      shouldSendConfirmation: false,
    });
    expect(decrementStock).not.toHaveBeenCalled();
  });

  it("re-claims the confirmation if an earlier settle died before mailing", async () => {
    verifyWebhookSignature.mockReturnValue(true);
    // Already paid, but confirmation_sent_at is still null, so the claim wins.
    queue(db.current.select, [
      { id: "o1", status: "paid", razorpayOrderId: RZP_ORDER },
    ]);
    queue(db.current.update, [{ id: "o1" }]);

    const result = await handleWebhook({ rawBody: captured, signature: "ok" });

    expect(result).toMatchObject({
      firstSettle: false,
      shouldSendConfirmation: true,
    });
    // Still no stock taken — that already happened on the first settle.
    expect(decrementStock).not.toHaveBeenCalled();
  });

  it("marks a failed payment failed", async () => {
    verifyWebhookSignature.mockReturnValue(true);
    const result = await handleWebhook({
      rawBody: JSON.stringify({
        event: "payment.failed",
        payload: { payment: { entity: { id: RZP_PAYMENT, order_id: RZP_ORDER } } },
      }),
      signature: "ok",
    });
    expect(result).toEqual({ handled: "failed", razorpayOrderId: RZP_ORDER });
    expect(decrementStock).not.toHaveBeenCalled();
  });

  it("propagates oversell as OutOfStockError so the transaction rolls back", async () => {
    verifyWebhookSignature.mockReturnValue(true);
    queue(
      db.current.select,
      [{ id: "o1", status: "created", razorpayOrderId: RZP_ORDER }],
      [{ variantId: 1, qty: 5 }],
    );
    decrementStock.mockRejectedValue(new OutOfStockError());

    await expect(
      handleWebhook({ rawBody: captured, signature: "ok" }),
    ).rejects.toBeInstanceOf(OutOfStockError);
  });
});
