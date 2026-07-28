"use client";

import Link from "next/link";

import {
  CartLineList,
  CartTotals,
  CartWarning,
} from "@/components/commerce/CartLines";
import { useCartValidation } from "@/components/commerce/useCartValidation";
import { TriangleA } from "@/components/layout/Wordmark";
import { ButtonZ } from "@/components/ui/button-z";
import { shippingFor } from "@/lib/data/policies";
import { formatINR } from "@/lib/utils";
import { cartCount, cartSubtotal, useCartStore } from "@/stores/cart";

export default function CartPage() {
  const items = useCartStore((s) => s.items);

  // Always on here — the page is the cart.
  const { validation, corrected, lineFor } = useCartValidation(items, true);

  const count = cartCount(items);
  const subtotal = validation?.subtotalInr ?? cartSubtotal(items);
  const shipping = validation?.shippingInr ?? shippingFor(subtotal);
  const total = validation?.totalInr ?? subtotal + shipping;

  return (
    <div className="px-6 pt-8 pb-24 md:px-12">
      <header>
        <p className="t-label text-accent">Bag</p>
        <h1 className="t-display-lg mt-4">Cart</h1>
        {count > 0 ? (
          <p className="t-label mt-3 text-fg-muted">
            {count} {count === 1 ? "item" : "items"}
          </p>
        ) : null}
      </header>

      {items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-5 border-t border-line py-24 text-center">
          <TriangleA className="text-4xl" />
          <p className="t-display-sm">Your bag is empty.</p>
          <ButtonZ asChild variant="outline">
            <Link href="/shop">Shop trousers</Link>
          </ButtonZ>
        </div>
      ) : (
        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_22rem]">
          <div>
            <CartWarning shown={corrected} />
            <CartLineList items={items} lineFor={lineFor} />
          </div>

          <aside className="h-fit rounded-sm border border-line bg-bg-raised p-6 lg:sticky lg:top-28">
            <h2 className="t-label text-fg-muted">Order summary</h2>

            <div className="mt-6">
              <CartTotals subtotal={subtotal} shipping={shipping} />
            </div>

            <div className="mt-6 flex items-baseline justify-between border-t border-line pt-4">
              <span className="t-label text-fg-muted">Total</span>
              <span className="t-display-sm">{formatINR(total)}</span>
            </div>

            <ButtonZ asChild size="lg" className="mt-6 w-full">
              <Link href="/checkout">Checkout</Link>
            </ButtonZ>

            <p className="t-label mt-4 text-fg-muted">
              {shipping === 0
                ? "Shipping is on us."
                : `Add ${formatINR(2000 - subtotal)} for free shipping.`}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
