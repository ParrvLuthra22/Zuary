"use server";

import "server-only";

import { z } from "zod";

import { PRODUCTS } from "@/shared/constants/products";
import { validateCart, type CartValidation } from "@/server/db/queries";

const PRODUCT_SLUGS = PRODUCTS.map((p) => p.slug) as [string, ...string[]];

const schema = z.array(
  z.object({
    slug: z.enum(PRODUCT_SLUGS),
    size: z.enum(["S", "M", "L", "XL"]),
    qty: z.number().int().min(0).max(99),
    unitPriceInr: z.number().int().min(0).optional(),
  }),
);

/**
 * Server-side re-check of whatever is sitting in localStorage. The browser is
 * free to send nonsense; this decides what the cart actually is.
 */
export async function validateCartAction(
  raw: unknown,
): Promise<CartValidation> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      lines: [],
      subtotalInr: 0,
      shippingInr: 0,
      totalInr: 0,
      changed: true,
      stockKnown: false,
    };
  }
  return validateCart(parsed.data);
}
