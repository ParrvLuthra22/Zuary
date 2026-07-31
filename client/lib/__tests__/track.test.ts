import { beforeEach, describe, expect, it, vi } from "vitest";

const vercelTrack = vi.hoisted(() => vi.fn());
vi.mock("@vercel/analytics", () => ({ track: vercelTrack }));

const { paymentFailureReason, track } = await import("@/client/lib/track");

beforeEach(() => vi.clearAllMocks());

describe("track", () => {
  it("forwards the event name and properties unchanged", () => {
    track("add_to_cart", { slug: "kohl", size: "M", price: 1200 });
    expect(vercelTrack).toHaveBeenCalledWith("add_to_cart", {
      slug: "kohl",
      size: "M",
      price: 1200,
    });
  });

  it("sends an empty object for a propertyless event", () => {
    track("cart_opened");
    expect(vercelTrack).toHaveBeenCalledWith("cart_opened", {});
  });

  /**
   * The runtime guard exists for the spread case: `track("x", { ...product })`
   * type-checks today and starts shipping an email the moment someone adds one
   * to the product shape.
   */
  it("refuses PII in development rather than sending it", () => {
    expect(() =>
      track("add_to_cart", {
        slug: "kohl",
        size: "M",
        price: 1200,
        email: "a@b.com",
      } as never),
    ).not.toThrow(); // track swallows, but...
    expect(vercelTrack).not.toHaveBeenCalled(); // ...nothing was sent.
  });

  it("does not mutate the caller's object", () => {
    const properties = { slug: "kohl", size: "M", price: 1200 };
    track("add_to_cart", properties);
    expect(properties).toEqual({ slug: "kohl", size: "M", price: 1200 });
  });

  it("never throws, whatever the analytics client does", () => {
    vercelTrack.mockImplementation(() => {
      throw new Error("blocked by an ad blocker");
    });
    expect(() => track("cart_opened")).not.toThrow();
  });

  it("allows an orderId, which is ours and opaque", () => {
    track("payment_completed", { orderId: "3f2b-1c", total: 2400 });
    expect(vercelTrack).toHaveBeenCalledWith("payment_completed", {
      orderId: "3f2b-1c",
      total: 2400,
    });
  });
});

describe("paymentFailureReason", () => {
  it("prefers a typed error code", () => {
    expect(paymentFailureReason({ code: "OUT_OF_STOCK" })).toBe("out_of_stock");
    expect(paymentFailureReason({ code: "PAYMENT" })).toBe("payment");
  });

  it("recognises a network failure", () => {
    expect(paymentFailureReason(new Error("Failed to fetch"))).toBe("network");
  });

  it("falls back to a single bucket rather than free text", () => {
    expect(paymentFailureReason(new Error("something odd"))).toBe("unknown");
    expect(paymentFailureReason(null)).toBe("unknown");
  });
});
