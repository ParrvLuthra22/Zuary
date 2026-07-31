import "server-only";

export type CartLineInput = {
  slug: string;
  size: string;
  qty: number;
  /** What the browser thinks this costs. Checked, never trusted. */
  unitPriceInr?: number;
};

export type ValidatedLine = {
  slug: string;
  size: string;
  requestedQty: number;
  /** Requested qty clamped to what is actually on the shelf. */
  qty: number;
  unitPriceInr: number;
  lineTotalInr: number;
  stock: number | null;
  available: boolean;
  issues: ("unavailable" | "price-changed" | "qty-reduced")[];
};

export type CartValidation = {
  lines: ValidatedLine[];
  subtotalInr: number;
  shippingInr: number;
  totalInr: number;
  /** True when anything the browser sent had to be corrected. */
  changed: boolean;
  /** False when there is no database — stock is then unknown, not zero. */
  stockKnown: boolean;
};

export const ORDERS_PER_PAGE = 50;

/**
 * The filter names the admins use, mapped to what they mean in the data.
 *
 * "unshipped" is the working queue and is not a status — it is paid-and-not-yet
 * -handed-over, which is exactly the list someone stands at the packing table
 * with. Everything else is a plain status match.
 */
export type OrderFilter =
  | "all"
  | "unshipped"
  | "shipped"
  | "delivered"
  | "failed"
  | "cancelled";

export type CustomerSort = "spent" | "orders" | "joined";
