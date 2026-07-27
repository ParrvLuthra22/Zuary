import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import { getOrderWithItems } from "@/lib/db/queries";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false },
};

// Orders are per-visitor and change after payment — never cache this.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderPage({ params }: Params) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const order = await getOrderWithItems(id).catch(() => undefined);
  if (!order) notFound();

  return (
    <div className="px-6 pt-16 pb-24 md:px-12">
      <header>
        <p className="t-label text-accent">
          {order.status === "paid" ? "Confirmed" : order.status}
        </p>
        <h1 className="t-display-lg mt-4">Thank you.</h1>
        <p className="mt-4 font-mono text-sm text-fg-muted">
          Order {order.id.slice(0, 8).toUpperCase()}
        </p>
      </header>

      <div className="mt-16 max-w-xl">
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

        <Separator className="my-6 bg-line" />

        <div className="flex items-baseline justify-between">
          <span className="t-label text-fg-muted">Total</span>
          <span className="font-mono text-lg">{formatINR(order.totalInr)}</span>
        </div>

        <div className="mt-12">
          <p className="t-label text-fg-muted">Shipping to</p>
          <address className="mt-2 text-sm not-italic text-fg-muted">
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

        <Link href="/shop" className="t-label mt-12 inline-block text-accent">
          Back to the drop →
        </Link>
      </div>
    </div>
  );
}
