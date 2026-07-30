import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  ORDER_DATE,
  StatusPill,
  orderNumber,
} from "@/components/account/OrderBits";
import { ButtonZ } from "@/components/ui/button-z";
import { getProduct } from "@/lib/data/products";
import { getOrderForUser } from "@/lib/db/queries";
import type { OrderStatus } from "@/lib/db/schema";
import { SUPPORT_EMAIL, pageMetadata } from "@/lib/site";
import { cn, formatINR } from "@/lib/utils";

export const metadata: Metadata = pageMetadata({
  title: "Order",
  description: "Order detail.",
  path: "/account/orders",
  noIndex: true,
});

/** The happy path, in order. Anything not on it has no timeline. */
const TIMELINE: { key: OrderStatus; label: string }[] = [
  { key: "created", label: "Placed" },
  { key: "paid", label: "Paid" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect(`/login?next=/account/orders/${id}`);

  /*
   * Ownership is enforced in the query, not here — see getOrderForUser. Another
   * customer's order id and a nonexistent one both come back undefined, so this
   * page cannot tell them apart and neither can whoever is probing it.
   */
  let order;
  try {
    order = await getOrderForUser(id, session.user.id);
  } catch (error) {
    console.error("[account/orders/:id]", error);
    throw error;
  }
  if (!order) notFound();

  const reached = TIMELINE.findIndex((step) => step.key === order.status);
  // cancelled and failed are not points on the line; they get no timeline.
  const onHappyPath = reached !== -1;

  const supportSubject = encodeURIComponent(
    `Order ${orderNumber(order.id)} — help`,
  );

  return (
    <div className="max-w-3xl">
      <Link
        href="/account/orders"
        className="t-label text-fg-muted transition-colors hover:text-fg"
      >
        ← All orders
      </Link>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="t-display-sm">{orderNumber(order.id)}</h2>
          <p className="t-label mt-2 text-fg-muted">
            Placed {ORDER_DATE.format(new Date(order.createdAt))}
          </p>
        </div>
        <StatusPill status={order.status} />
      </div>

      {onHappyPath ? (
        <ol className="mt-12 flex items-start" aria-label="Order progress">
          {TIMELINE.map((step, i) => {
            const done = i <= reached;
            return (
              <li
                key={step.key}
                className={cn(
                  "relative flex-1",
                  i === TIMELINE.length - 1 && "flex-none",
                )}
              >
                <div className="flex items-center">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      done ? "bg-accent" : "bg-line",
                    )}
                  />
                  {i < TIMELINE.length - 1 ? (
                    <span
                      aria-hidden
                      className={cn(
                        "h-px flex-1",
                        i < reached ? "bg-accent" : "bg-line",
                      )}
                    />
                  ) : null}
                </div>
                <span
                  className={cn(
                    "t-label mt-3 block pr-4",
                    done ? "text-fg" : "text-fg-muted",
                  )}
                >
                  {step.label}
                </span>
                <span className="sr-only">
                  {done ? "completed" : "not yet"}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {/* Lines */}
      <ul className="mt-14 border-t border-line">
        {order.items.map((item) => {
          const product = getProduct(item.productSlug);
          const src = product?.images[0];
          return (
            <li
              key={item.id}
              className="flex items-center gap-4 border-b border-line py-5"
            >
              <div className="relative h-24 w-[4.8rem] shrink-0 overflow-hidden rounded-sm border border-line bg-bg-raised">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt={product?.imageAlts?.[0] ?? item.productSlug}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm text-fg">
                  {product?.name ?? item.productSlug}
                </p>
                <p className="t-label mt-1.5 text-fg-muted">
                  {item.size} × {item.qty}
                </p>
              </div>

              <span className="font-mono text-sm text-fg-muted">
                {formatINR(item.unitPriceInr * item.qty)}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-10 grid gap-12 sm:grid-cols-2">
        <div>
          <h3 className="t-label text-fg-muted">Payment</h3>
          <dl className="mt-4 space-y-2.5">
            <Row label="Subtotal" value={formatINR(order.subtotalInr)} />
            <Row
              label="Shipping"
              value={
                order.shippingInr === 0 ? "Free" : formatINR(order.shippingInr)
              }
            />
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="t-label text-fg-muted">Total</span>
            <span className="t-display-sm">{formatINR(order.totalInr)}</span>
          </div>
        </div>

        <div>
          <h3 className="t-label text-fg-muted">Shipping to</h3>
          <address className="mt-4 text-sm leading-relaxed text-fg-muted not-italic">
            <span className="block text-fg">{order.addressJson.name}</span>
            {order.addressJson.line1}
            {order.addressJson.line2 ? (
              <>
                <br />
                {order.addressJson.line2}
              </>
            ) : null}
            <br />
            {order.addressJson.city}, {order.addressJson.state}
            <br />
            {order.addressJson.pincode}
            <br />
            <span className="mt-2 block font-mono text-xs">{order.phone}</span>
          </address>
        </div>
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-line pt-8">
        {order.trackingNumber ? (
          <ButtonZ asChild variant="outline">
            {/* Courier-agnostic: the number is what support and the customer
                both quote, and we do not pretend to know the carrier's URL
                scheme until a carrier is actually chosen. */}
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(order.trackingNumber)}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              Track shipment
            </a>
          </ButtonZ>
        ) : null}

        {/* The returns flow, deliberately a mailto rather than a form: a return
            is a conversation, and a human reads every one. The order number is
            pre-filled so nobody has to be asked for it. */}
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${supportSubject}`}
          className="t-label text-accent-ink underline-offset-4 hover:underline"
        >
          Need help with this order?
        </a>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="t-label text-fg-muted">{label}</dt>
      <dd className="font-mono text-sm text-fg-muted">{value}</dd>
    </div>
  );
}
