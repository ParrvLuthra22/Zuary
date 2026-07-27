"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { getProduct, type ProductSlug, type Size } from "@/lib/data/products";

export type CartItem = {
  slug: ProductSlug;
  size: Size;
  qty: number;
};

const MAX_QTY_PER_LINE = 5;

type CartState = {
  items: CartItem[];
  /** False until the persisted cart has been read back from storage. */
  hydrated: boolean;
  add: (slug: ProductSlug, size: Size, qty?: number) => void;
  remove: (slug: ProductSlug, size: Size) => void;
  setQty: (slug: ProductSlug, size: Size, qty: number) => void;
  clear: () => void;
  /** Drops lines whose slug is no longer in the catalogue. */
  reconcile: () => void;
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
            return { items: [...state.items, { slug, size, qty: clampQty(qty) }] };
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

      reconcile: () =>
        set((state) => ({
          hydrated: true,
          items: state.items.filter((i) => Boolean(getProduct(i.slug))),
        })),
    }),
    {
      name: "zuary-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.reconcile();
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
