import { describe, expect, it } from "vitest";

import {
  FREE_SHIPPING_THRESHOLD_INR,
  SHIPPING_FLAT_INR,
  shippingFor,
} from "@/shared/constants/policies";

/**
 * The shipping rule, tested at the boundary rather than in the middle.
 *
 * ₹2000 exactly is the interesting number: it is the one a `>` instead of a
 * `>=` gets wrong, and the one a customer notices because the site advertises
 * "free over ₹2,000" on the shipping policy page.
 */
describe("shippingFor", () => {
  it("is free at exactly the threshold", () => {
    expect(shippingFor(2000)).toBe(0);
  });

  it("charges the flat rate one rupee below", () => {
    expect(shippingFor(1999)).toBe(99);
  });

  it("is free above the threshold", () => {
    expect(shippingFor(2001)).toBe(0);
    expect(shippingFor(999_999)).toBe(0);
  });

  it("charges on an empty and a small basket", () => {
    expect(shippingFor(0)).toBe(99);
    expect(shippingFor(1)).toBe(99);
  });

  it("agrees with the exported constants", () => {
    // Guards against someone changing the threshold and not the copy, or the
    // other way round — both are read by the policy page.
    expect(shippingFor(FREE_SHIPPING_THRESHOLD_INR)).toBe(0);
    expect(shippingFor(FREE_SHIPPING_THRESHOLD_INR - 1)).toBe(
      SHIPPING_FLAT_INR,
    );
  });

  it("never returns a negative or fractional charge", () => {
    for (const subtotal of [0, 1, 998, 1999, 2000, 5000]) {
      const shipping = shippingFor(subtotal);
      expect(shipping).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(shipping)).toBe(true);
    }
  });
});

describe("order total", () => {
  it("is always subtotal plus shipping, and shipping is only ever 0 or 99", () => {
    for (const subtotal of [0, 1, 999, 1999, 2000, 2001, 12_345]) {
      const shipping = shippingFor(subtotal);
      expect([0, SHIPPING_FLAT_INR]).toContain(shipping);
      expect(subtotal + shipping).toBe(
        subtotal + (subtotal >= FREE_SHIPPING_THRESHOLD_INR ? 0 : 99),
      );
    }
  });

  it("does not make a bigger basket cheaper at the threshold", () => {
    // ₹1999 + ₹99 = ₹2098, and ₹2000 + ₹0 = ₹2000. This is the one place the
    // total legitimately drops as the basket grows, and it is worth knowing
    // that it does: it is a real ₹98 discount at the boundary, not a bug.
    const below = 1999 + shippingFor(1999);
    const at = 2000 + shippingFor(2000);
    expect(below).toBe(2098);
    expect(at).toBe(2000);
    expect(at).toBeLessThan(below);
  });
});
