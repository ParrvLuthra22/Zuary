import "server-only";

import { render } from "@react-email/components";
import { Resend } from "resend";
import { OrderCancelled } from "@/emails/OrderCancelled";
import { OrderConfirmation } from "@/emails/OrderConfirmation";
import { OrderShipped } from "@/emails/OrderShipped";
import type { OrderEmailLine } from "@/emails/OrderConfirmation";
import { getProduct } from "@/shared/constants/products";
import { getOrderWithItems } from "@/server/db/queries";
import { shortOrderId } from "@/shared/utils/order-number";
import { formatINR } from "@/shared/utils";

import { WaitlistWelcome } from "@/emails/WaitlistWelcome";
import { emailOrigin } from "@/emails/components/EmailLayout";


export type SendResult = { ok: boolean; id?: string; error?: string };

/** From address. Must be on a domain verified in Resend or delivery is silent. */
function from() {
  return process.env.EMAIL_FROM ?? "ZUARY <hello@zuary.in>";
}

let client: Resend | undefined;
function resend() {
  const key = process.env.AUTH_RESEND_KEY ?? process.env.RESEND_API_KEY;
  if (!key) return undefined;
  client ??= new Resend(key);
  return client;
}

/**
 * The single way this app sends mail.
 *
 * Two contracts, both load-bearing:
 *
 * 1. It never throws. Every caller is on a path where something more important
 *    already happened — a payment settled, an account was created — and an SMTP
 *    hiccup must not turn that into a 500 or roll anything back. Failures are
 *    logged and returned as `{ ok: false }`.
 * 2. With no API key it renders and logs instead of sending, so the whole flow
 *    is exercisable in development without a Resend account and without
 *    accidentally mailing a real address from a laptop.
 */
export async function sendEmail({
  to,
  subject,
  react,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  replyTo?: string;
}): Promise<SendResult> {
  try {
    const service = resend();

    if (!service) {
      // Rendering here rather than skipping it is deliberate: it is what catches
      // a template that throws, which would otherwise only surface in production.
      const html = await render(react);
      console.info(
        `[email] no API key — not sending.\n  to: ${Array.isArray(to) ? to.join(", ") : to}\n  subject: ${subject}\n  html: ${html.length} bytes`,
      );
      if (process.env.EMAIL_DEBUG_HTML === "true") console.info(html);
      return { ok: true };
    }

    const { data, error } = await service.emails.send({
      from: from(),
      to,
      subject,
      react,
      ...(replyTo ? { replyTo } : {}),
    });

    if (error) {
      console.error("[email] send failed", subject, error);
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id };
  } catch (error) {
    console.error("[email] send threw", subject, error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "unknown",
    };
  }
}



const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export { shortOrderId } from "@/shared/utils/order-number";

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



/**
 * Unsubscribe link for marketing mail.
 *
 * TODO(B06): back this with a signed token and a real /unsubscribe route. The
 * address is encoded rather than signed today, which is enough to identify the
 * row but NOT enough to authorise the removal — the route that consumes it must
 * verify a signature before deleting anything, or it becomes an endpoint for
 * unsubscribing other people.
 */
function unsubscribeUrl(email: string) {
  return `${emailOrigin()}/unsubscribe?email=${encodeURIComponent(email)}`;
}

/**
 * Email positional, because the address is the only thing this needs and every
 * caller has one. `productSlug` is what the notify drawer knows and the footer
 * signup does not, so it stays optional rather than forcing a null at one call
 * site to satisfy the other.
 */
export async function sendWaitlistWelcome(
  email: string,
  options: { productSlug?: string } = {},
) {
  try {
    const product = options.productSlug
      ? getProduct(options.productSlug)
      : undefined;

    return await sendEmail({
      to: email,
      subject: "You're on the list",
      react: WaitlistWelcome({
        productName: product?.name ?? null,
        unsubscribeUrl: unsubscribeUrl(email),
      }),
    });
  } catch (error) {
    console.error("[email] waitlist welcome failed", error);
    return { ok: false };
  }
}
