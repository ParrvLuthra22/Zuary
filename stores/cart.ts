"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { getProduct, type ProductSlug, type Size } from "@/lib/data/products";

export type CartItem = {
  slug: ProductSlug;
  size: Size;
  qty: number;
  /** Price shown when the line was added. Sent to the server so a tampered or
   *  stale value can be detected — never used as the price of record. */
  unitPriceInr: number;
};

const MAX_QTY_PER_LINE = 5;

type CartState = {
  items: CartItem[];
  /**
   * False until the persisted cart has been read back from storage.
   *
   * Nothing may render cart contents, and above all nothing may redirect or
   * clear based on the cart, before this is true. On the first paint after any
   * full page load — which is exactly what returning from a Google redirect
   * is — `items` is still the empty initial value. Acting on it there is how a
   * customer comes back from signing in to an empty bag.
   */
  hydrated: boolean;
  add: (slug: ProductSlug, size: Size, qty?: number) => void;
  remove: (slug: ProductSlug, size: Size) => void;
  setQty: (slug: ProductSlug, size: Size, qty: number) => void;
  clear: () => void;
  /** Drops lines whose slug is no longer in the catalogue. */
  reconcile: () => void;
  /** Applies the server's verdict: clamped quantities and real prices. */
  applyServerTruth: (
    lines: { slug: string; size: string; qty: number; unitPriceInr: number }[],
  ) => void;
};

const sameLine = (item: CartItem, slug: ProductSlug, size: Size) =>
  item.slug === slug && item.size === size;

const clampQty = (qty: number) =>
  Math.max(0, Math.min(MAX_QTY_PER_LINE, Math.floor(qty)));

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,

      add: (slug, size, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => sameLine(i, slug, size));
          if (!existing) {
            return {
              items: [
                ...state.items,
                {
                  slug,
                  size,
                  qty: clampQty(qty),
                  unitPriceInr: getProduct(slug)?.price ?? 0,
                },
              ],
            };
          }
          return {
            items: state.items.map((i) =>
              sameLine(i, slug, size) ? { ...i, qty: clampQty(i.qty + qty) } : i,
            ),
          };
        }),

      remove: (slug, size) =>
        set((state) => ({
          items: state.items.filter((i) => !sameLine(i, slug, size)),
        })),

      setQty: (slug, size, qty) =>
        set((state) => {
          const next = clampQty(qty);
          if (next === 0) {
            return { items: state.items.filter((i) => !sameLine(i, slug, size)) };
          }
          return {
            items: state.items.map((i) =>
              sameLine(i, slug, size) ? { ...i, qty: next } : i,
            ),
          };
        }),

      clear: () => set({ items: [] }),

      applyServerTruth: (lines) =>
        set((state) => ({
          items: state.items
            .map((item) => {
              const truth = lines.find(
                (l) => l.slug === item.slug && l.size === item.size,
              );
              if (!truth) return item;
              return { ...item, qty: truth.qty, unitPriceInr: truth.unitPriceInr };
            })
            .filter((item) => item.qty > 0),
        })),

      reconcile: () =>
        set((state) => ({
          hydrated: true,
          items: state.items
            .filter((i) => Boolean(getProduct(i.slug)))
            // Carts persisted before prices were stored have no unitPriceInr.
            .map((i) => ({
              ...i,
              unitPriceInr: i.unitPriceInr ?? getProduct(i.slug)?.price ?? 0,
            })),
        })),
    }),
    {
      name: "zuary-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      /*
       * Runs once, after the persisted cart has been read back — including when
       * there was nothing to read. Everything that renders from the cart waits
       * on the flag this sets.
       *
       * The error branch matters more than it looks. If storage is unreadable
       * (private mode, a corrupt value, a quota error) the callback still fires,
       * just with an error and no state. Leaving `hydrated` false there would
       * strand every cart surface on its skeleton forever, so it is flipped
       * regardless: an empty cart we can render is better than a page that
       * never resolves.
       */
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("[cart] rehydrate failed", error);
          useCartStore.setState({ hydrated: true });
          return;
        }
        if (state) {
          state.reconcile();
          return;
        }
        useCartStore.setState({ hydrated: true });
      },
    },
  ),
);

/* ── Derived ───────────────────────────────────────────────── */

export const cartCount = (items: CartItem[]) =>
  items.reduce((total, item) => total + item.qty, 0);

export const cartSubtotal = (items: CartItem[]) =>
  items.reduce((total, item) => {
    const product = getProduct(item.slug);
    return product ? total + product.price * item.qty : total;
  }, 0);

/** Cart lines joined to the catalogue, for rendering. */
export const cartLines = (items: CartItem[]) =>
  items.flatMap((item) => {
    const product = getProduct(item.slug);
    if (!product) return [];
    return [{ ...item, product, lineTotal: product.price * item.qty }];
  });

export const useCartCount = () => useCartStore((s) => cartCount(s.items));
export const useCartSubtotal = () => useCartStore((s) => cartSubtotal(s.items));

/**
 * Gate for anything that reads the cart. Server-rendered markup and the first
 * client paint both see false, so a component that respects this cannot
 * produce a hydration mismatch either.
 */
export const useCartHydrated = () => useCartStore((s) => s.hydrated);
