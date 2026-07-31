"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setEarlyAccessAction } from "@/server/actions/orders.actions";
import type { CustomerSort } from "@/server/db/queries";
import { cn, formatINR } from "@/shared/utils";

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const SORTS: { value: CustomerSort; label: string }[] = [
  { value: "spent", label: "Total spent" },
  { value: "orders", label: "Orders" },
  { value: "joined", label: "Joined" },
];

export type AdminCustomerRow = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  earlyAccess: boolean;
  role: string;
  createdAt: Date;
  orderCount: number;
  totalSpent: number;
};

export function CustomersTable({
  rows,
  sort,
}: {
  rows: AdminCustomerRow[];
  sort: CustomerSort;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  /** Optimistic overrides so the switch moves before the round trip. */
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  function setSort(next: CustomerSort) {
    const sp = new URLSearchParams(params.toString());
    if (next === "spent") sp.delete("sort");
    else sp.set("sort", next);
    const qs = sp.toString();
    router.push(qs ? `/admin/customers?${qs}` : "/admin/customers");
  }

  function toggle(row: AdminCustomerRow) {
    const next = !(overrides[row.id] ?? row.earlyAccess);
    setOverrides((o) => ({ ...o, [row.id]: next }));
    setPendingId(row.id);
    startTransition(async () => {
      const result = await setEarlyAccessAction(row.id, next);
      setPendingId(null);
      if (!result.ok) {
        // Put it back — the server refused.
        setOverrides((o) => ({ ...o, [row.id]: !next }));
        toast(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] text-fg-muted">Sort</span>
        {SORTS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setSort(s.value)}
            className={cn(
              "rounded border px-2.5 py-1 font-mono text-[11px] tracking-wide uppercase",
              sort === s.value
                ? "border-accent bg-accent text-carbon"
                : "border-line text-fg-muted hover:text-fg",
            )}
          >
            {s.label}
          </button>
        ))}
        <span className="ml-auto font-mono text-[11px] text-fg-muted">
          {rows.length} {rows.length === 1 ? "customer" : "customers"}
        </span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-y border-line">
              {[
                "Name",
                "Email",
                "Phone",
                "Orders",
                "Spent",
                "Joined",
                "Early access",
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
              const early = overrides[row.id] ?? row.earlyAccess;
              return (
                <tr
                  key={row.id}
                  className="border-b border-line/60 hover:bg-bg-raised/40"
                >
                  <td className="px-2 py-2">
                    <Link
                      href={`/admin/customers/${row.id}`}
                      className="font-mono text-xs text-fg hover:text-accent-ink"
                    >
                      {row.name ?? "—"}
                    </Link>
                    {row.role === "admin" ? (
                      <span className="ml-2 font-mono text-[10px] text-accent-ink">
                        ADMIN
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-[15rem] truncate px-2 py-2 font-mono text-[11px] text-fg-muted">
                    {row.email}
                  </td>
                  <td className="px-2 py-2 font-mono text-[11px] text-fg-muted">
                    {row.phone ?? "—"}
                  </td>
                  <td className="px-2 py-2 font-mono text-xs">
                    {row.orderCount}
                  </td>
                  <td className="px-2 py-2 font-mono text-xs whitespace-nowrap">
                    {formatINR(row.totalSpent)}
                  </td>
                  <td className="px-2 py-2 font-mono text-[11px] whitespace-nowrap text-fg-muted">
                    {DATE.format(new Date(row.createdAt))}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={early}
                      aria-label={`Early access for ${row.email}`}
                      disabled={pendingId === row.id}
                      onClick={() => toggle(row)}
                      className={cn(
                        "h-5 w-9 rounded-full border transition-colors disabled:opacity-50",
                        early
                          ? "border-accent bg-accent"
                          : "border-line bg-bg-raised",
                      )}
                    >
                      <span
                        className={cn(
                          "block size-3.5 rounded-full bg-off-white transition-transform",
                          early ? "translate-x-[18px]" : "translate-x-[2px]",
                        )}
                      />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
