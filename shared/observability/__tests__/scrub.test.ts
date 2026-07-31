import { describe, expect, it } from "vitest";

import { isMoneyRoute, scrub, scrubUrl } from "@/shared/observability/scrub";

/**
 * The scrubber is the only thing standing between a customer's details and a
 * third-party error tracker, so it gets tested harder than most of the app.
 */

describe("scrub — keys", () => {
  it("redacts a customer's contact details wherever they sit", () => {
    const event = {
      user: { email: "someone@example.com", phone: "9876543210" },
      contexts: {
        order: {
          addressJson: { line1: "12 Example Road", pincode: "560001" },
        },
      },
    };
    const out = scrub(event);
    expect(JSON.stringify(out)).not.toContain("someone@example.com");
    expect(JSON.stringify(out)).not.toContain("9876543210");
    expect(JSON.stringify(out)).not.toContain("12 Example Road");
    expect(JSON.stringify(out)).not.toContain("560001");
  });

  it("is case-insensitive about key names", () => {
    const out = scrub({ Email: "a@b.com", PHONE: "9876543210", Line1: "x" });
    expect(Object.values(out)).toEqual([
      "[redacted]",
      "[redacted]",
      "[redacted]",
    ]);
  });

  it("keeps the fields that make an event useful", () => {
    const out = scrub({
      orderId: "3f2b1c",
      route: "/api/checkout/verify",
      status: "paid",
      totalInr: 2400,
    });
    expect(out).toEqual({
      orderId: "3f2b1c",
      route: "/api/checkout/verify",
      status: "paid",
      totalInr: 2400,
    });
  });
});

describe("scrub — values in free text", () => {
  it("catches an email inside an error message", () => {
    const out = scrub({
      message: "failed to mail receipt to buyer@example.com after 3 tries",
    });
    expect(out.message).not.toContain("buyer@example.com");
    expect(out.message).toContain("[email]");
  });

  it("catches a phone number inside a breadcrumb", () => {
    const out = scrub({ breadcrumb: "otp sent to 9876543210" });
    expect(out.breadcrumb).toBe("otp sent to [phone]");
  });

  it("catches a phone number with a country code", () => {
    expect(scrub({ s: "+91 9876543210" }).s).toContain("[phone]");
    expect(scrub({ s: "+919876543210" }).s).toContain("[phone]");
  });

  it("redacts Razorpay keys in either environment", () => {
    const out = scrub({
      note: "using rzp_live_AbCd1234 and rzp_test_XyZ9876",
    });
    expect(out.note).not.toMatch(/AbCd1234|XyZ9876/);
    expect(out.note).toContain("rzp_[redacted]");
  });

  it("redacts a key_secret quoted in a provider error", () => {
    const out = scrub({
      message: 'Authentication failed: key_secret="abc123XYZ" rejected',
    });
    expect(out.message).not.toContain("abc123XYZ");
  });

  it("redacts a bearer token", () => {
    const out = scrub({ h: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6" });
    expect(out.h).toBe("Bearer [redacted]");
  });
});

describe("scrub — structure", () => {
  it("walks arrays and nested objects", () => {
    const out = scrub({
      items: [{ buyer: { email: "a@b.com" } }, { buyer: { email: "c@d.com" } }],
    });
    expect(JSON.stringify(out)).not.toMatch(/a@b\.com|c@d\.com/);
  });

  it("survives a cycle without hanging", () => {
    const node: Record<string, unknown> = { safe: "value" };
    node.self = node;
    expect(() => scrub(node)).not.toThrow();
  });

  it("caps depth rather than recursing forever", () => {
    let deep: Record<string, unknown> = { email: "a@b.com" };
    for (let i = 0; i < 40; i++) deep = { nested: deep };
    expect(() => scrub(deep)).not.toThrow();
    expect(JSON.stringify(scrub(deep))).not.toContain("a@b.com");
  });

  it("leaves primitives and null alone", () => {
    expect(scrub(null)).toBe(null);
    expect(scrub(undefined)).toBe(undefined);
    expect(scrub(42)).toBe(42);
    expect(scrub(true)).toBe(true);
  });
});

describe("scrubUrl", () => {
  it("keeps the path and drops the query", () => {
    expect(scrubUrl("https://zuary.com/account?email=a@b.com")).toBe(
      "https://zuary.com/account",
    );
  });

  it("handles a relative path", () => {
    expect(scrubUrl("/api/orders/123?token=abc")).toBe("/api/orders/123");
  });

  it("passes undefined through", () => {
    expect(scrubUrl(undefined)).toBe(undefined);
  });
});

describe("isMoneyRoute", () => {
  it("flags checkout and webhook routes", () => {
    expect(isMoneyRoute("/api/checkout/create-order")).toBe(true);
    expect(isMoneyRoute("/api/checkout/verify")).toBe(true);
    expect(isMoneyRoute("/api/webhooks/razorpay")).toBe(true);
  });

  it("does not flag ordinary routes", () => {
    expect(isMoneyRoute("/api/waitlist")).toBe(false);
    expect(isMoneyRoute("/shop")).toBe(false);
    expect(isMoneyRoute(undefined)).toBe(false);
  });
});
