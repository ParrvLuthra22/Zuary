import { OrderCancelled } from "@/emails/OrderCancelled";
import { OrderConfirmation } from "@/emails/OrderConfirmation";
import { OrderShipped } from "@/emails/OrderShipped";
import type { OrderEmailLine } from "@/emails/OrderConfirmation";
import { getProduct } from "@/lib/data/products";
import { getOrderWithItems } from "@/lib/db/queries";
import { formatINR } from "@/lib/utils";

import { sendEmail } from "./send";

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Same short id the account pages and support use. */
export const shortOrderId = (id: string) =>
  id.replace(/-/g, "").slice(0, 8).toUpperCase();

type OrderRow = NonNullable<Awaited<ReturnType<typeof getOrderWithItems>>>;

/**
 * Order rows store a slug and a price, not a display name or an image. The
 * catalogue supplies the rest — and a slug that has since left the catalogue
 * still renders, just without a picture, rather than dropping the line from a
 * receipt.
 */
function linesFor(order: OrderRow): OrderEmailLine[] {
  return order.items.map((item) => {
    const product = getProduct(item.productSlug);
    return {
      name: product?.name ?? item.productSlug.toUpperCase(),
      size: item.size,
      qty: item.qty,
      lineTotal: formatINR(item.unitPriceInr * item.qty),
      image: product?.images[0] ?? null,
    };
  });
}

const addressFor = (order: OrderRow) => ({
  name: order.addressJson.name,
  line1: order.addressJson.line1,
  line2: order.addressJson.line2 ?? null,
  city: order.addressJson.city,
  state: order.addressJson.state,
  pincode: order.addressJson.pincode,
});

/**
 * Loads an order and mails its confirmation.
 *
 * Takes an id rather than a row so callers on the settle path do not have to
 * carry one, and so this can be retried later from anywhere with just the id.
 * Never throws — see sendEmail.
 */
export async function sendOrderConfirmation(orderId: string) {
  try {
    const order = await getOrderWithItems(orderId);
    if (!order) {
      console.error("[email] confirmation: no such order", orderId);
      return { ok: false };
    }

    const short = shortOrderId(order.id);

    return await sendEmail({
      to: order.email,
      subject: `Order ${short} confirmed`,
      react: OrderConfirmation({
        shortId: short,
        orderId: order.id,
        placedOn: DATE.format(new Date(order.createdAt)),
        lines: linesFor(order),
        subtotal: formatINR(order.subtotalInr),
        shipping:
          order.shippingInr === 0 ? "Free" : formatINR(order.shippingInr),
        total: formatINR(order.totalInr),
        address: addressFor(order),
      }),
    });
  } catch (error) {
    // Belt and braces: sendEmail already swallows, this covers the load.
    console.error("[email] confirmation failed", orderId, error);
    return { ok: false };
  }
}

export async function sendOrderShipped(orderId: string) {
  try {
    const order = await getOrderWithItems(orderId);
    if (!order) {
      console.error("[email] shipped: no such order", orderId);
      return { ok: false };
    }
    if (!order.trackingNumber) {
      // Nothing useful to say without an AWB, and a shipped mail with no
      // reference generates a support ticket rather than saving one.
      console.error("[email] shipped: no tracking number", orderId);
      return { ok: false };
    }

    const short = shortOrderId(order.id);

    return await sendEmail({
      to: order.email,
      subject: `Order ${short} is on its way`,
      react: OrderShipped({
        shortId: short,
        orderId: order.id,
        courier: order.courier ?? "Courier",
        awb: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        address: addressFor(order),
      }),
    });
  } catch (error) {
    console.error("[email] shipped failed", orderId, error);
    return { ok: false };
  }
}

export async function sendOrderCancelled(orderId: string) {
  try {
    const order = await getOrderWithItems(orderId);
    if (!order) {
      console.error("[email] cancelled: no such order", orderId);
      return { ok: false };
    }

    const short = shortOrderId(order.id);

    return await sendEmail({
      to: order.email,
      subject: `Order ${short} cancelled`,
      react: OrderCancelled({
        shortId: short,
        orderId: order.id,
        lines: linesFor(order),
        refundTotal: formatINR(order.totalInr),
      }),
    });
  } catch (error) {
    console.error("[email] cancelled failed", orderId, error);
    return { ok: false };
  }
}
