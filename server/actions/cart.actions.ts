"use server";

import "server-only";

import { validateCart, type CartValidation } from "@/server/db/queries";
import { validateCartSchema } from "@/server/validators/checkout.validator";

/**
 * Server-side re-check of whatever is sitting in localStorage.
 *
 * The one action with no guard, deliberately: the cart belongs to the browser
 * and is re-priced for signed-out visitors too. There is nothing here to
 * authorise — no row is read or written that belongs to anyone, and the result
 * is derived entirely from the catalogue and public stock. Requiring a session
 * would break the cart page for every visitor who has not signed in yet.
 *
 * A malformed payload returns an empty, stock-unknown validation rather than
 * throwing. The browser is free to send nonsense; this decides what the cart
 * actually is.
 */
export async function validateCartAction(
  raw: unknown,
): Promise<CartValidation> {
  const parsed = validateCartSchema.safeParse(raw);
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
