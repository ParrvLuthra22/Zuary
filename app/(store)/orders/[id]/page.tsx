import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderPending } from "@/components/commerce/OrderPending";
import { TriangleA } from "@/components/layout/Wordmark";
import { ButtonZ } from "@/components/ui/button-z";
import { getOrderWithItems } from "@/lib/db/queries";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false },
};

// Status changes the moment the webhook lands — never cache this.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderPage({ params }: Params) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const order = await getOrderWithItems(id).catch(() => undefined);
  if (!order) notFound();

  const short = order.id.slice(0, 8).toUpperCase();

  // Only a settled order gets the confirmation. Anything else waits on the
  // webhook rather than claiming something that has not happened.
  if (order.status !== "paid") {
    return (
      <div className="px-6 pt-8 pb-24 md:px-12">
        <p className="t-label text-fg-muted">Order {short}</p>
        <OrderPending orderId={order.id} />
      </div>
    );
  }

  return (
    <div className="px-6 pt-8 pb-24 md:px-12">
      <header className="flex flex-col items-center py-12 text-center">
        <TriangleA className="text-5xl" />
        <h1 className="t-display-md mt-8">Order confirmed.</h1>
        <p className="t-label mt-4 text-fg-muted">Order {short}</p>
      </header>

      <div className="mx-auto max-w-xl">
        <ul className="divide-y divide-line border-y border-line">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex justify-between gap-4 py-4 font-mono text-sm"
            >
              <span className="text-fg uppercase">
                {item.productSlug}
                <span className="text-fg-muted">
                  {" "}
                  {item.size} × {item.qty}
                </span>
              </span>
              <span className="text-fg-muted">
                {formatINR(item.unitPriceInr * item.qty)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 space-y-2 font-mono text-sm">
          <div className="flex justify-between">
            <span className="text-fg-muted">Subtotal</span>
            <span>{formatINR(order.subtotalInr)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-muted">Shipping</span>
            <span>
              {order.shippingInr === 0 ? "Free" : formatINR(order.shippingInr)}
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-baseline justify-between border-t border-line pt-6">
          <span className="t-label text-fg-muted">Total</span>
          <span className="t-display-sm">{formatINR(order.totalInr)}</span>
        </div>

        <div className="mt-12 grid gap-10 sm:grid-cols-2">
          <div>
            <p className="t-label text-fg-muted">Shipping to</p>
            <address className="mt-2 text-sm text-fg-muted not-italic">
              {order.addressJson.name}
              <br />
              {order.addressJson.line1}
              {order.addressJson.line2 ? (
                <>
                  <br />
                  {order.addressJson.line2}
                </>
              ) : null}
              <br />
              {order.addressJson.city}, {order.addressJson.state}{" "}
              {order.addressJson.pincode}
            </address>
          </div>

          <div>
            <p className="t-label text-fg-muted">Dispatch</p>
            <p className="mt-2 text-sm text-fg-muted">
              Ships within 3 working days. Tracking follows by email.
            </p>
          </div>
        </div>

        <ButtonZ asChild variant="outline" className="mt-12">
          <Link href="/shop">Back to the shop</Link>
        </ButtonZ>
      </div>
    </div>
  );
}
