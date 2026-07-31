"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { MarkShippedDialog } from "@/client/components/admin/MarkShippedDialog";
import type { OrderFilter } from "@/server/db/queries";
import type { OrderStatus } from "@/server/db/schema";
import { shortOrderId } from "@/shared/utils/order-number";
import { cn, formatINR } from "@/shared/utils";

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: "unshipped", label: "Paid (unshipped)" },
  { value: "all", label: "All" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** Payment and fulfilment are two readings of one status column. */
function payment(status: OrderStatus) {
  if (status === "created") return { label: "Pending", tone: "muted" };
  if (status === "failed") return { label: "Failed", tone: "bad" };
  if (status === "cancelled") return { label: "Refunding", tone: "bad" };
  return { label: "Paid", tone: "good" };
}

function fulfilment(status: OrderStatus) {
  switch (status) {
    case "shipped":
      return { label: "Shipped", tone: "good" };
    case "delivered":
      return { label: "Delivered", tone: "muted" };
    case "cancelled":
      return { label: "Cancelled", tone: "bad" };
    case "paid":
      return { label: "To ship", tone: "warn" };
    default:
      return { label: "—", tone: "muted" };
  }
}

const TONE: Record<string, string> = {
  good: "text-accent-ink",
  warn: "text-fg",
  bad: "text-fg-muted line-through",
  muted: "text-fg-muted",
};

export type AdminOrderRow = {
  id: string;
  createdAt: Date;
  email: string;
  phone: string;
  addressJson: { name: string };
  totalInr: number;
  status: OrderStatus;
  itemCount: number;
};

export function OrdersTable({
  rows,
  filter,
  search,
  page,
  pages,
  total,
}: {
  rows: AdminOrderRow[];
  filter: OrderFilter;
  search: string;
  page: number;
  pages: number;
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [term, setTerm] = useState(search);
  const [shipping, setShipping] = useState<AdminOrderRow | null>(null);

  /** Filter and search live in the URL so a view can be linked or reloaded. */
  function go(next: { filter?: string; q?: string; page?: number }) {
    const sp = new URLSearchParams(params.toString());
    if (next.filter !== undefined) {
      if (next.filter === "unshipped") sp.delete("filter");
      else sp.set("filter", next.filter);
      sp.delete("page");
    }
    if (next.q !== undefined) {
      if (next.q) sp.set("q", next.q);
      else sp.delete("q");
      sp.delete("page");
    }
    if (next.page !== undefined) {
      if (next.page <= 1) sp.delete("page");
      else sp.set("page", String(next.page));
    }
    const qs = sp.toString();
    router.push(qs ? `/admin/orders?${qs}` : "/admin/orders");
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => go({ filter: f.value })}
            className={cn(
              "rounded border px-2.5 py-1 font-mono text-[11px] tracking-wide uppercase",
              filter === f.value
                ? "border-accent bg-accent text-carbon"
                : "border-line text-fg-muted hover:text-fg",
            )}
          >
            {f.label}
          </button>
        ))}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            go({ q: term });
          }}
          className="ml-auto flex items-center gap-2"
        >
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Order no, email, phone"
            aria-label="Search orders"
            className="h-8 w-56 rounded border border-line bg-bg px-2.5 font-mono text-xs text-fg outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="h-8 rounded border border-line px-3 font-mono text-[11px] tracking-wide text-fg-muted uppercase hover:text-fg"
          >
            Search
          </button>
        </form>
      </div>

      <p className="mt-3 font-mono text-[11px] text-fg-muted">
        {total} {total === 1 ? "order" : "orders"}
        {search ? ` matching “${search}”` : ""}
      </p>

      {rows.length === 0 ? (
        <p className="py-16 text-center font-mono text-xs text-fg-muted">
          Nothing here.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-y border-line">
                {[
                  "Order",
                  "Date",
                  "Customer",
                  "Items",
                  "Total",
                  "Payment",
                  "Fulfilment",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-2 py-2 font-mono text-[10px] font-normal tracking-[0.15em] text-fg-muted uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const pay = payment(row.status);
                const ful = fulfilment(row.status);
                return (
                  <tr
                    key={row.id}
                    className="border-b border-line/60 hover:bg-bg-raised/40"
                  >
                    <td className="px-2 py-2">
                      <Link
                        href={`/admin/orders/${row.id}`}
                        className="font-mono text-xs text-fg hover:text-accent-ink"
                      >
                        {shortOrderId(row.id)}
                      </Link>
                    </td>
                    <td className="px-2 py-2 font-mono text-xs whitespace-nowrap text-fg-muted">
                      {DATE.format(new Date(row.createdAt))}
                    </td>
                    <td className="max-w-[16rem] px-2 py-2">
                      <span className="block truncate font-mono text-xs text-fg">
                        {row.addressJson?.name ?? "—"}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-fg-muted">
                        {row.email}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-mono text-xs text-fg-muted">
                      {row.itemCount}
                    </td>
                    <td className="px-2 py-2 font-mono text-xs whitespace-nowrap text-fg">
                      {formatINR(row.totalInr)}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-2 font-mono text-[11px]",
                        TONE[pay.tone],
                      )}
                    >
                      {pay.label}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-2 font-mono text-[11px]",
                        TONE[ful.tone],
                      )}
                    >
                      {ful.label}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {row.status === "paid" ? (
                        <button
                          type="button"
                          onClick={() => setShipping(row)}
                          className="rounded border border-line px-2 py-1 font-mono text-[11px] tracking-wide text-fg-muted uppercase hover:border-accent hover:text-accent-ink"
                        >
                          Mark shipped
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => go({ page: page - 1 })}
            className="rounded border border-line px-2.5 py-1 font-mono text-[11px] uppercase disabled:opacity-40"
          >
            Prev
          </button>
          <span className="font-mono text-[11px] text-fg-muted">
            {page} / {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => go({ page: page + 1 })}
            className="rounded border border-line px-2.5 py-1 font-mono text-[11px] uppercase disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}

      {shipping ? (
        <MarkShippedDialog
          key={shipping.id}
          orderId={shipping.id}
          orderNumber={shortOrderId(shipping.id)}
          open
          onOpenChange={(next) => {
            if (!next) setShipping(null);
          }}
        />
      ) : null}
    </>
  );
}
