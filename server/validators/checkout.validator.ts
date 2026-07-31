import "server-only";

import { z } from "zod";

import { PRODUCTS } from "@/shared/constants/products";
import { ALL_REGIONS } from "@/shared/constants/states";

/**
 * Server-side checkout schemas.
 *
 * Separate from shared/validators/checkout.ts on purpose. That file is the
 * form's schema and is imported by a client component, so it can only describe
 * what the field should look like. This one is the trust boundary: it pins the
 * slug to the real catalogue and the state to the real list, neither of which a
 * form needs to enforce and both of which the server must.
 *
 * Nothing about money appears here. Prices are read from the database in
 * orders.service and a `unitPriceInr` from the caller is never consulted, so
 * there is nothing to validate.
 */

const SLUGS = PRODUCTS.map((p) => p.slug) as [string, ...string[]];
// Regions, not INDIAN_STATES — that constant excludes the union territories,
// and rejecting Delhi at the trust boundary would break checkout for the one
// address we actually ship from.
const STATES = ALL_REGIONS as unknown as [string, ...string[]];

export const cartLineSchema = z.object({
  slug: z.enum(SLUGS),
  size: z.enum(["S", "M", "L", "XL"]),
  qty: z.number().int().min(1).max(99),
});

export const shippingAddressSchema = z.object({
  name: z.string().trim().min(2).max(80),
  line1: z.string().trim().min(4).max(160),
  line2: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(60),
  state: z.enum(STATES),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit PIN."),
  country: z.string().trim().max(60).default("India"),
});

export const createOrderSchema = z.object({
  contact: z.object({
    email: z.string().email().max(200),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number."),
  }),
  address: shippingAddressSchema,
  items: z.array(cartLineSchema).min(1, "Your cart is empty.").max(50),
  saveAddress: z.boolean().optional().default(false),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(4).max(120),
  razorpay_payment_id: z.string().min(4).max(120),
  razorpay_signature: z.string().min(16).max(256),
});

/** What the cart page re-checks. qty 0 is allowed — it means "removed". */
export const validateCartSchema = z.array(
  z.object({
    slug: z.enum(SLUGS),
    size: z.enum(["S", "M", "L", "XL"]),
    qty: z.number().int().min(0).max(99),
    unitPriceInr: z.number().int().min(0).optional(),
  }),
);

export const waitlistSchema = z.object({
  email: z.string().email("That email does not look right.").max(200),
  source: z.string().max(64).default("site"),
  /* The notify drawer sends these; every other form omits them. */
  product: z.enum(SLUGS).optional(),
  size: z.enum(["S", "M", "L", "XL"]).optional(),
});
