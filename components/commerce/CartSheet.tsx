"use client";

import { Minus, Plus, X } from "lucide-react";
import Link from "next/link";

import { ProductImage } from "@/components/commerce/ProductImage";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatINR } from "@/lib/utils";
import { cartLines, cartSubtotal, useCartStore } from "@/stores/cart";
import { useUIStore } from "@/stores/ui";

export function CartSheet() {
  const open = useUIStore((s) => s.cartOpen);
  const setCartOpen = useUIStore((s) => s.setCartOpen);

  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);

  const lines = cartLines(items);
  const subtotal = cartSubtotal(items);

  return (
    <Sheet open={open} onOpenChange={setCartOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-line bg-bg sm:max-w-md"
      >
        <SheetHeader className="border-b border-line">
          <SheetTitle className="t-label text-fg">
            Cart ({lines.length})
          </SheetTitle>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
            <p className="t-label text-fg-muted">Nothing in here yet.</p>
            <Link
              href="/shop"
              onClick={() => setCartOpen(false)}
              className="t-label text-accent hover:underline"
            >
              See the drop
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
              {lines.map((line) => (
                <li
                  key={`${line.slug}-${line.size}`}
                  className="flex gap-4 py-5"
                >
                  <ProductImage
                    src={line.product.images[0]}
                    alt={line.product.name}
                    swatch={line.product.swatch}
                    sizes="72px"
                    className="h-24 w-18 shrink-0 rounded-sm border border-line"
                  />

                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm text-fg">
                          {line.product.name}
                        </p>
                        <p className="t-label mt-1 text-fg-muted">
                          {line.size} · {line.product.fit}
                        </p>
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

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 rounded-sm border border-line px-2 py-1">
                        <button
                          type="button"
                          onClick={() =>
                            setQty(line.slug, line.size, line.qty - 1)
                          }
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
                          onClick={() =>
                            setQty(line.slug, line.size, line.qty + 1)
                          }
                          aria-label="Increase quantity"
                          className="text-fg-muted transition-colors hover:text-fg"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <span className="font-mono text-sm text-fg-muted">
                        {formatINR(line.lineTotal)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="space-y-4 px-6 pb-6">
              <Separator className="bg-line" />
              <div className="flex items-baseline justify-between">
                <span className="t-label text-fg-muted">Subtotal</span>
                <span className="font-mono text-lg text-fg">
                  {formatINR(subtotal)}
                </span>
              </div>
              <p className="t-label text-fg-muted">
                Shipping free. Taxes included.
              </p>
              <Button
                asChild
                className="h-14 w-full rounded-sm bg-accent font-mono text-xs tracking-[0.18em] text-carbon uppercase hover:bg-accent-soft"
              >
                <Link href="/checkout" onClick={() => setCartOpen(false)}>
                  Checkout
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
