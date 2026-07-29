"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, TriangleAlert, X } from "lucide-react";
import Link from "next/link";

import { ProductThumb } from "@/components/commerce/ProductThumb";
import type { ValidatedLine } from "@/lib/db/queries";
import { dur, easeOut } from "@/lib/motion/easing";
import { cn, formatINR } from "@/lib/utils";
import { cartLines, useCartStore, type CartItem } from "@/stores/cart";

const LOW_STOCK = 3;
/** Fallback ceiling when the server cannot tell us the real stock. */
const MAX_WITHOUT_STOCK = 5;

export function CartWarning({ shown }: { shown: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {shown ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: dur.fast, ease: [...easeOut] }}
          className="overflow-hidden"
        >
          <p className="t-label mx-6 my-4 flex items-start gap-2 border border-accent/40 bg-accent/10 p-3 text-accent-ink">
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            Your bag was updated to match current prices and stock.
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function CartLineList({
  items,
  lineFor,
  onNavigate,
  compact = false,
}: {
  items: CartItem[];
  lineFor: (slug: string, size: string) => ValidatedLine | undefined;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);

  return (
    <ul className="divide-y divide-line border-y border-line">
      <AnimatePresence initial={false}>
        {cartLines(items).map((line) => {
          const checked = lineFor(line.slug, line.size);
          const unitPrice = checked?.unitPriceInr ?? line.product.price;
          const stock = checked?.stock ?? null;
          const ceiling = stock ?? MAX_WITHOUT_STOCK;
          const soldOut = checked?.available === false;

          return (
            <motion.li
              key={`${line.slug}-${line.size}`}
              layout
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: dur.fast, ease: [...easeOut] }}
              className="overflow-hidden"
            >
              <div className={cn("flex gap-4 py-5", compact ? "px-6" : "")}>
                <ProductThumb
                  product={line.product}
                  sizes="96px"
                  className="h-30 w-24"
                />

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/products/${line.slug}`}
                        onClick={onNavigate}
                        className="font-mono text-sm text-fg hover:text-accent-ink"
                      >
                        {line.product.name}
                      </Link>
                      <p className="t-label mt-1 text-fg-muted">
                        {line.size} · {formatINR(unitPrice)}
                      </p>
                      {soldOut ? (
                        <p className="t-label mt-1 text-accent-ink">Sold out</p>
                      ) : stock !== null && stock <= LOW_STOCK ? (
                        <p className="t-label mt-1 text-accent-ink">
                          Only {stock} left
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(line.slug, line.size)}
                      aria-label={`Remove ${line.product.name} ${line.size}`}
                      className="text-fg-muted transition-colors hover:text-fg"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 rounded-sm border border-line px-2 py-1">
                      <button
                        type="button"
                        onClick={() => setQty(line.slug, line.size, line.qty - 1)}
                        aria-label="Decrease quantity"
                        className="text-fg-muted transition-colors hover:text-fg"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="font-mono text-xs tabular-nums">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        disabled={line.qty >= ceiling}
                        onClick={() => setQty(line.slug, line.size, line.qty + 1)}
                        aria-label="Increase quantity"
                        className="text-fg-muted transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>

                    <span className="font-mono text-sm text-fg-muted">
                      {formatINR(unitPrice * line.qty)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

export function CartTotals({
  subtotal,
  shipping,
}: {
  subtotal: number;
  shipping: number;
}) {
  return (
    <div className="space-y-2 font-mono text-sm">
      <div className="flex justify-between">
        <span className="text-fg-muted">Subtotal</span>
        <span>{formatINR(subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-fg-muted">Shipping</span>
        <span>
          {shipping === 0 ? "Free over ₹2,000" : formatINR(shipping)}
        </span>
      </div>
    </div>
  );
}
