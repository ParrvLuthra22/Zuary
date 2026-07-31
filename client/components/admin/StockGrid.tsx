"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { setStockAction } from "@/server/actions/catalogue.actions";
import { cn } from "@/shared/utils";

const SIZES = ["S", "M", "L", "XL"] as const;
const LOW = 5;

export type StockCell = {
  variantId: number;
  productSlug: string;
  productName: string;
  size: string;
  sku: string;
  stock: number;
};

export function StockGrid({ cells }: { cells: StockCell[] }) {
  /** Local truth, so an edit shows immediately and survives a failed save. */
  const [values, setValues] = useState<Record<number, number>>(() =>
    Object.fromEntries(cells.map((c) => [c.variantId, c.stock])),
  );
  const [saving, setSaving] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const products = useMemo(() => {
    const map = new Map<string, { name: string; bySize: Map<string, StockCell> }>();
    for (const cell of cells) {
      const entry = map.get(cell.productSlug) ?? {
        name: cell.productName,
        bySize: new Map(),
      };
      entry.bySize.set(cell.size, cell);
      map.set(cell.productSlug, entry);
    }
    return [...map.entries()];
  }, [cells]);

  const totals = useMemo(() => {
    const list = Object.values(values);
    return {
      units: list.reduce((sum, n) => sum + n, 0),
      outOfStock: list.filter((n) => n === 0).length,
      skus: list.length,
    };
  }, [values]);

  function commit(cell: StockCell, raw: string) {
    const next = Math.max(0, Math.min(9999, Math.floor(Number(raw) || 0)));
    const previous = values[cell.variantId];
    if (next === previous) return;

    // Optimistic: the cell shows the new number before the round trip.
    setValues((v) => ({ ...v, [cell.variantId]: next }));
    setSaving(cell.variantId);

    startTransition(async () => {
      const result = await setStockAction(cell.variantId, next);
      setSaving(null);
      if (result.ok) {
        toast(`${cell.sku} → ${next}`);
      } else {
        // Put the old value back rather than leaving a number on screen that
        // is not in the database — stock people act on has to be true.
        setValues((v) => ({ ...v, [cell.variantId]: previous }));
        toast(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 rounded border border-line px-3 py-2">
        <span className="font-mono text-[11px] text-fg-muted">
          Units in stock <span className="text-fg">{totals.units}</span>
        </span>
        <span className="font-mono text-[11px] text-fg-muted">
          SKUs out of stock{" "}
          <span className={totals.outOfStock > 0 ? "text-accent-ink" : "text-fg"}>
            {totals.outOfStock}
          </span>
          <span className="text-fg-muted"> / {totals.skus}</span>
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-y border-line">
              <th className="px-2 py-2 font-mono text-[10px] font-normal tracking-[0.15em] text-fg-muted uppercase">
                Product
              </th>
              {SIZES.map((size) => (
                <th
                  key={size}
                  scope="col"
                  className="px-2 py-2 font-mono text-[10px] font-normal tracking-[0.15em] text-fg-muted uppercase"
                >
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map(([slug, entry]) => (
              <tr key={slug} className="border-b border-line/60">
                <td className="px-2 py-2">
                  <span className="font-mono text-xs text-fg">{entry.name}</span>
                  <span className="ml-2 font-mono text-[10px] text-fg-muted">
                    {slug}
                  </span>
                </td>
                {SIZES.map((size) => {
                  const cell = entry.bySize.get(size);
                  if (!cell) {
                    return (
                      <td
                        key={size}
                        className="px-2 py-2 font-mono text-[11px] text-fg-muted"
                      >
                        —
                      </td>
                    );
                  }
                  const value = values[cell.variantId];
                  const low = value < LOW;
                  return (
                    <td key={size} className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        aria-label={`${entry.name} size ${size} stock`}
                        defaultValue={value}
                        key={`${cell.variantId}-${value}`}
                        disabled={saving === cell.variantId}
                        onBlur={(e) => commit(cell, e.target.value)}
                        onKeyDown={(e) => {
                          // Enter commits without waiting for focus to move.
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        className={cn(
                          "h-8 w-16 rounded border bg-bg px-2 font-mono text-xs outline-none focus:border-accent disabled:opacity-50",
                          low
                            ? "border-accent/60 text-accent-ink"
                            : "border-line text-fg",
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 font-mono text-[10px] text-fg-muted">
        Highlighted below {LOW}. Saves on blur; every change is recorded in the
        audit log with its previous value.
      </p>
    </>
  );
}
