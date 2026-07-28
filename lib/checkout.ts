import { z } from "zod";

import { PRODUCTS, getProduct, type Size } from "@/lib/data/products";
import { shippingFor } from "@/lib/data/policies";

const PRODUCT_SLUGS = PRODUCTS.map((p) => p.slug) as [string, ...string[]];

export const cartItemSchema = z.object({
  slug: z.enum(PRODUCT_SLUGS),
  size: z.enum(["S", "M", "L", "XL"]),
  qty: z.number().int().min(1).max(5),
});

export const addressSchema = z.object({
  name: z.string().min(2, "Full name, please."),
  line1: z.string().min(4, "Street address is too short."),
  line2: z.string().optional(),
  city: z.string().min(2, "City is required."),
  state: z.string().min(2, "State is required."),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Six-digit Indian PIN code."),
  // Not `.default()` — that splits the input and output types and breaks
  // react-hook-form's resolver. The form ships it as a hidden field instead.
  country: z.string().min(2),
});

export const checkoutSchema = z.object({
  email: z.string().email("That email does not look right."),
  phone: z
    .string()
    .regex(/^[6-9][0-9]{9}$/, "Ten-digit Indian mobile number, no +91."),
  address: addressSchema,
  items: z.array(cartItemSchema).min(1, "Cart is empty."),
});

/**
 * What the checkout form itself validates. Items live in the cart store, not in
 * the form, and are attached to the payload on submit.
 */
export const checkoutFormSchema = checkoutSchema.omit({ items: true });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;
export type AddressInput = z.infer<typeof addressSchema>;

export const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

/**
 * Prices are recomputed here from the catalogue, never taken from the client.
 * The browser only ever sends slug/size/qty.
 */
export function priceCart(items: { slug: string; size: Size; qty: number }[]) {
  const lines = items.flatMap((item) => {
    const product = getProduct(item.slug);
    if (!product) return [];
    return [
      {
        slug: product.slug,
        size: item.size,
        qty: item.qty,
        unitPriceInr: product.price,
        lineTotalInr: product.price * item.qty,
      },
    ];
  });

  const subtotalInr = lines.reduce((sum, line) => sum + line.lineTotalInr, 0);
  const shippingInr = shippingFor(subtotalInr);

  return { lines, subtotalInr, shippingInr, totalInr: subtotalInr + shippingInr };
}
