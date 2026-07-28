import type { Metadata } from "next";

import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Orders",
  description: "Track a ZUARY order.",
  path: "/orders",
  noIndex: true,
});

export default function OrdersPage() {
  return (
    <div className="px-6 pt-16 pb-24 md:px-12">
      <header>
        <p className="t-label text-accent-ink">Track</p>
        <h1 className="t-display-lg mt-4">Orders</h1>
      </header>

      <p className="mt-8 max-w-xl text-fg-muted">
        Order lookup is not wired up yet. The confirmation email carries a direct
        link to your order, and the tracking link follows when the parcel leaves
        the warehouse.
      </p>

      <p className="t-label mt-6 text-fg-muted">
        Anything urgent — hello@zuary.in
      </p>
    </div>
  );
}
