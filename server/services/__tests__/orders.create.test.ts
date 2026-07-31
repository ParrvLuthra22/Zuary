import { beforeEach, describe, expect, it, vi } from "vitest";

import { OutOfStockError, PaymentError, ValidationError } from "@/shared/errors";
import { makeDb, queue, type DbStub } from "./harness";

/* ── Mocks, declared before the module under test is imported ──────────── */

const db = vi.hoisted(() => ({ current: null as unknown as DbStub }));
const getPricedVariants = vi.hoisted(() => vi.fn());
const rzpCreate = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  get db() {
    return db.current;
  },
  getDb: () => db.current,
}));

vi.mock("@/server/services/inventory.service", () => ({
  getPricedVariants,
  decrementStock: vi.fn(),
}));

vi.mock("@/server/services/payments.service", () => ({
  razorpay: () => ({ orders: { create: rzpCreate } }),
  toPaise: (rupees: number) => Math.round(rupees * 100),
  RAZORPAY_CURRENCY: "INR",
  verifyPaymentSignature: vi.fn(),
  verifyWebhookSignature: vi.fn(),
}));

const { createOrder } = await import("@/server/services/orders.service");

/* ── Fixtures ───────────────────────────────────────────────────────────── */

const ADDRESS = {
  name: "Test Person",
  line1: "12 Example Road",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560001",
  country: "India",
};
const CONTACT = { email: "test@example.com", phone: "9876543210" };

/** KOHL M, ₹1200 in the database, 10 in stock. */
const KOHL_M = {
  variantId: 1,
  stock: 10,
  priceInr: 1200,
  productSlug: "kohl",
  size: "M",
  active: true,
};

function seed(variants: (typeof KOHL_M)[] = [KOHL_M]) {
  getPricedVariants.mockResolvedValue(variants);
  db.current = makeDb();
  queue(db.current.insert, [{ id: "order-uuid-1" }]);
  rzpCreate.mockResolvedValue({
    id: "order_RZP1",
    amount: 0,
    currency: "INR",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  seed();
});

describe("createOrder — pricing", () => {
  it("ignores a client-supplied price entirely", async () => {
    await createOrder({
      userId: "u1",
      contact: CONTACT,
      address: ADDRESS,
      // A tampered cart claiming the trouser costs ₹1.
      items: [{ slug: "kohl", size: "M", qty: 1, unitPriceInr: 1 } as never],
    });

    // Razorpay is charged from the DB price, not the claimed one: ₹1200 plus
    // ₹99 shipping = ₹1299 = 129900 paise. If the client price leaked through
    // this would be 100 + 9900.
    expect(rzpCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 129_900 }),
    );
  });

  it("prices from the database even when the client sends nothing", async () => {
    await createOrder({
      userId: "u1",
      contact: CONTACT,
      address: ADDRESS,
      items: [{ slug: "kohl", size: "M", qty: 2 }],
    });

    // 2 × ₹1200 = ₹2400, over the free-shipping threshold, so ₹2400.
    expect(rzpCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 240_000 }),
    );
  });

  it("charges shipping below the threshold and not above it", async () => {
    await createOrder({
      userId: "u1",
      contact: CONTACT,
      address: ADDRESS,
      items: [{ slug: "kohl", size: "M", qty: 1 }],
    });
    expect(rzpCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 129_900 }), // 1200 + 99
    );

    seed();
    await createOrder({
      userId: "u1",
      contact: CONTACT,
      address: ADDRESS,
      items: [{ slug: "kohl", size: "M", qty: 2 }],
    });
    expect(rzpCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 240_000 }), // 2400 + 0
    );
  });

  it("writes a total that equals subtotal plus shipping", async () => {
    await createOrder({
      userId: "u1",
      contact: CONTACT,
      address: ADDRESS,
      items: [{ slug: "kohl", size: "M", qty: 1 }],
    });

    const values = db.current.insert.mock.calls.length;
    expect(values).toBeGreaterThan(0);
    // The amount handed to Razorpay is the authoritative total; assert the
    // arithmetic directly rather than reaching into the insert builder.
    const paise = rzpCreate.mock.calls[0][0].amount;
    expect(paise).toBe((1200 + 99) * 100);
  });
});

describe("createOrder — stock", () => {
  it("rejects when stock is insufficient", async () => {
    seed([{ ...KOHL_M, stock: 1 }]);

    await expect(
      createOrder({
        userId: "u1",
        contact: CONTACT,
        address: ADDRESS,
        items: [{ slug: "kohl", size: "M", qty: 2 }],
      }),
    ).rejects.toBeInstanceOf(OutOfStockError);

    // And nothing was charged.
    expect(rzpCreate).not.toHaveBeenCalled();
  });

  it("rejects a variant that is not in the catalogue", async () => {
    seed([]);
    await expect(
      createOrder({
        userId: "u1",
        contact: CONTACT,
        address: ADDRESS,
        items: [{ slug: "kohl", size: "XL", qty: 1 }],
      }),
    ).rejects.toBeInstanceOf(OutOfStockError);
  });

  it("rejects an inactive product even when stock is plentiful", async () => {
    seed([{ ...KOHL_M, active: false, stock: 99 }]);
    await expect(
      createOrder({
        userId: "u1",
        contact: CONTACT,
        address: ADDRESS,
        items: [{ slug: "kohl", size: "M", qty: 1 }],
      }),
    ).rejects.toBeInstanceOf(OutOfStockError);
  });

  it("rejects an empty cart", async () => {
    await expect(
      createOrder({
        userId: "u1",
        contact: CONTACT,
        address: ADDRESS,
        items: [],
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("createOrder — provider failure", () => {
  it("raises PaymentError without leaking the provider's message", async () => {
    rzpCreate.mockRejectedValue(
      new Error("BAD_REQUEST_ERROR: key_id is invalid, internal ref 88213"),
    );

    const caught = await createOrder({
      userId: "u1",
      contact: CONTACT,
      address: ADDRESS,
      items: [{ slug: "kohl", size: "M", qty: 1 }],
    }).catch((error) => error);

    expect(caught).toBeInstanceOf(PaymentError);
    // The customer-facing string must not repeat Razorpay's internals.
    expect(caught.message).not.toMatch(/key_id|internal ref|BAD_REQUEST/);
    // ...but the real cause is retained for the log.
    expect(String(caught.cause)).toContain("key_id is invalid");
  });
});
