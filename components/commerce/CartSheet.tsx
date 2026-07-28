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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { shippingFor } from "@/lib/data/policies";
import { formatINR } from "@/lib/utils";
import { cartCount, cartSubtotal, useCartStore } from "@/stores/cart";
import { useUIStore } from "@/stores/ui";

export function CartSheet() {
  const open = useUIStore((s) => s.cartOpen);
  const setCartOpen = useUIStore((s) => s.setCartOpen);
  const items = useCartStore((s) => s.items);

  // Re-checked on open and on every quantity change.
  const { validation, corrected, lineFor } = useCartValidation(items, open);

  const count = cartCount(items);
  const subtotal = validation?.subtotalInr ?? cartSubtotal(items);
  const shipping = validation?.shippingInr ?? shippingFor(subtotal);
  const total = validation?.totalInr ?? subtotal + shipping;

  return (
    <Sheet open={open} onOpenChange={setCartOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-line bg-bg p-0 sm:max-w-[480px]"
      >
        <SheetHeader className="border-b border-line px-6">
          <SheetTitle className="flex items-baseline gap-3">
            <span className="t-display-sm text-fg">Bag</span>
            <span className="t-label text-fg-muted">
              {count} {count === 1 ? "item" : "items"}
            </span>
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6">
            <TriangleA className="text-4xl" />
            <p className="t-display-sm">Your bag is empty.</p>
            <ButtonZ asChild variant="outline">
              <Link href="/shop" onClick={() => setCartOpen(false)}>
                Shop trousers
              </Link>
            </ButtonZ>
          </div>
        ) : (
          <>
            <CartWarning shown={corrected} />

            <div className="flex-1 overflow-y-auto">
              <CartLineList
                items={items}
                lineFor={lineFor}
                onNavigate={() => setCartOpen(false)}
                compact
              />
            </div>

            <div className="space-y-4 border-t border-line px-6 py-6">
              <CartTotals subtotal={subtotal} shipping={shipping} />

              <div className="flex items-baseline justify-between border-t border-line pt-4">
                <span className="t-label text-fg-muted">Total</span>
                <span className="t-display-sm">{formatINR(total)}</span>
              </div>

              <ButtonZ asChild size="lg" className="w-full">
                <Link href="/checkout" onClick={() => setCartOpen(false)}>
                  Checkout
                </Link>
              </ButtonZ>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
