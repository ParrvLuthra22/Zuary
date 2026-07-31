import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth/config";
import {
  ORDER_DATE,
  StatusPill,
  ThumbStack,
  orderNumber,
} from "@/client/components/account/OrderBits";
import { TriangleA } from "@/client/components/layout/Wordmark";
import { ButtonZ } from "@/client/components/ui/button-z";
import { listOrdersForUser } from "@/server/db/queries";
import { pageMetadata } from "@/shared/constants/site";
import { formatINR } from "@/shared/utils";

export const metadata: Metadata = pageMetadata({
  title: "Orders",
  description: "Your ZUARY order history.",
  path: "/account/orders",
  noIndex: true,
});

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/account/orders");

  /*
   * A database that is unreachable is not the same as an account with no
   * orders, and telling someone "No orders yet" when their orders exist but we
   * cannot read them is the worse of the two failures. So the error surfaces.
   */
  let orders;
  try {
    orders = await listOrdersForUser(session.user.id);
  } catch (error) {
    console.error("[account/orders]", error);
    return (
      <div className="py-12">
        <p className="t-display-sm">Could not load your orders.</p>
        <p className="mt-4 max-w-sm text-sm text-fg-muted">
          Something is wrong on our side, not with your account. Try again in a
          moment.
        </p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-start gap-5 py-16">
        <TriangleA className="text-4xl" />
        <p className="t-display-sm">No orders yet.</p>
        <ButtonZ asChild variant="outline">
          <Link href="/shop">Shop trousers</Link>
        </ButtonZ>
      </div>
    );
  }

  return (
    <>
      <h2 className="t-label text-fg-muted">
        {orders.length} {orders.length === 1 ? "order" : "orders"}
      </h2>

      <ul className="mt-6 border-t border-line">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              href={`/account/orders/${order.id}`}
              className="group flex flex-wrap items-center gap-x-6 gap-y-4 border-b border-line py-6 transition-colors duration-[--dur-micro] hover:bg-bg-raised/40"
            >
              <ThumbStack items={order.items} />

              <div className="min-w-0 flex-1">
                <p className="t-label text-fg group-hover:text-accent-ink">
                  {orderNumber(order.id)}
                </p>
                <p className="t-label mt-1.5 text-fg-muted">
                  {ORDER_DATE.format(new Date(order.createdAt))} ·{" "}
                  {order.items.length}{" "}
                  {order.items.length === 1 ? "item" : "items"}
                </p>
              </div>

              <StatusPill status={order.status} />

              <span className="font-mono text-sm text-fg">
                {formatINR(order.totalInr)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
