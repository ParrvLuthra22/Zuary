import { z } from "zod";

import { ALL_REGIONS } from "@/lib/data/states";
import { PRODUCTS, getProduct, type Size } from "@/lib/data/products";
import { shippingFor } from "@/lib/data/policies";

const PRODUCT_SLUGS = PRODUCTS.map((p) => p.slug) as [string, ...string[]];
const REGIONS = ALL_REGIONS as unknown as [string, ...string[]];

/** The browser sends what it wants, never what it costs. */
export const cartItemSchema = z.object({
  slug: z.enum(PRODUCT_SLUGS),
  size: z.enum(["S", "M", "L", "XL"]),
  qty: z.number().int().min(1).max(5),
});

export const contactSchema = z.object({
  email: z.string().email("That email does not look right."),
  phone: z
    .string()
    .regex(/^[6-9][0-9]{9}$/, "Ten digits after +91."),
});

export const addressSchema = z.object({
  name: z.string().min(2, "Full name, please."),
  line1: z.string().min(4, "Street address is too short."),
  line2: z.string().max(120).optional().or(z.literal("")),
  landmark: z.string().max(120).optional().or(z.literal("")),
  city: z.string().min(2, "City is required."),
  state: z.enum(REGIONS, { message: "Pick a state or union territory." }),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Six-digit Indian PIN code."),
  country: z.string().min(2),
});

/**
 * A saved address in the account, derived from the checkout rules above rather
 * than restated.
 *
 * Every shared constraint — the six-digit PIN, the ten-digit mobile, the
 * 36-entry region list — comes from one place, so a rule can never be tightened
 * at checkout and left loose in the account. The shape differs because the
 * table does: it carries a label and its own phone, and has no landmark column.
 */
export const savedAddressSchema = addressSchema
  .omit({ name: true, country: true, landmark: true })
  .extend({
    label: z.string().max(40).optional().or(z.literal("")),
    fullName: addressSchema.shape.name,
    phone: contactSchema.shape.phone,
    isDefault: z.boolean().optional(),
  });

export type SavedAddressInput = z.infer<typeof savedAddressSchema>;

export const checkoutSchema = z.object({
  contact: contactSchema,
  address: addressSchema,
  billingSameAsShipping: z.boolean(),
  items: z.array(cartItemSchema).min(1, "Cart is empty."),
});

/** What the checkout form itself validates — items live in the cart store. */
export const checkoutFormSchema = checkoutSchema.omit({ items: true });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;
export type AddressInput = z.infer<typeof addressSchema>;

export const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  ourOrderId: z.string().uuid().optional(),
});

/**
 * Catalogue pricing, used for display only. The order API reprices from the
 * database instead — this exists so the summary can render before the server
 * has spoken.
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
