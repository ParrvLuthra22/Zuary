"use client";

import { Minus, Plus, X } from "lucide-react";
import Link from "next/link";

import { ProductImage } from "@/components/commerce/ProductImage";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatINR, seriesLabel } from "@/lib/utils";
import { cartLines, cartSubtotal, useCartStore } from "@/stores/cart";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);

  const lines = cartLines(items);
  const subtotal = cartSubtotal(items);

  return (
    <div className="px-6 pt-16 pb-24 md:px-12">
      <header>
        <p className="t-label text-accent">Bag</p>
        <h1 className="t-display-lg mt-4">Cart</h1>
      </header>

      {lines.length === 0 ? (
        <div className="mt-16 border-t border-line pt-16">
          <p className="text-fg-muted">Nothing in here yet.</p>
          <Link href="/shop" className="t-label mt-4 inline-block text-accent">
            See the drop →
          </Link>
        </div>
      ) : (
        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_22rem]">
          <ul className="divide-y divide-line border-y border-line">
            {lines.map((line) => (
              <li key={`${line.slug}-${line.size}`} className="flex gap-6 py-6">
                <ProductImage
                  src={line.product.images[0]}
                  alt={line.product.name}
                  swatch={line.product.swatch}
                  sizes="112px"
                  className="aspect-[3/4] w-28 shrink-0 rounded-sm border border-line"
                />

                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="t-label text-fg-muted">
                        {seriesLabel(line.product.series)}
                      </p>
                      <Link
                        href={`/products/${line.slug}`}
                        className="t-display-sm mt-1 block hover:text-accent"
                      >
                        {line.product.name}
                      </Link>
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
                    <div className="flex items-center gap-4 rounded-sm border border-line px-3 py-1.5">
                      <button
                        type="button"
                        onClick={() => setQty(line.slug, line.size, line.qty - 1)}
                        aria-label="Decrease quantity"
                        className="text-fg-muted transition-colors hover:text-fg"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="font-mono text-sm tabular-nums">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(line.slug, line.size, line.qty + 1)}
                        aria-label="Increase quantity"
                        className="text-fg-muted transition-colors hover:text-fg"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>

                    <span className="font-mono text-sm text-fg">
                      {formatINR(line.lineTotal)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-sm border border-line bg-bg-raised p-6">
            <h2 className="t-label text-fg-muted">Summary</h2>
            <Separator className="my-6 bg-line" />
            <div className="flex justify-between font-mono text-sm">
              <span className="text-fg-muted">Subtotal</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            <div className="mt-2 flex justify-between font-mono text-sm">
              <span className="text-fg-muted">Shipping</span>
              <span>Free</span>
            </div>
            <Separator className="my-6 bg-line" />
            <div className="flex items-baseline justify-between">
              <span className="t-label text-fg-muted">Total</span>
              <span className="font-mono text-lg">{formatINR(subtotal)}</span>
            </div>

            <Button
              asChild
              className="mt-6 h-14 w-full rounded-sm bg-accent font-mono text-xs tracking-[0.18em] text-carbon uppercase hover:bg-accent-soft"
            >
              <Link href="/checkout">Checkout</Link>
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
