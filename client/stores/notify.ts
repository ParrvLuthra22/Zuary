"use client";

import "client-only";

import { create } from "zustand";

import type { Product } from "@/shared/constants/products";

type NotifyState = {
  isOpen: boolean;
  /** Held through the close animation so the drawer does not blank mid-exit. */
  product: Product | null;
  open: (product: Product) => void;
  close: () => void;
};

export const useNotifyStore = create<NotifyState>()((set) => ({
  isOpen: false,
  product: null,

  open: (product) => set({ isOpen: true, product }),
  close: () => set({ isOpen: false }),
}));
