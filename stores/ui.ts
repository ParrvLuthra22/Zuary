"use client";

import { create } from "zustand";

type UIState = {
  cartOpen: boolean;
  mobileNavOpen: boolean;
  reducedMotion: boolean;
  setCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  setReducedMotion: (reduced: boolean) => void;
};

export const useUIStore = create<UIState>()((set, get) => ({
  cartOpen: false,
  mobileNavOpen: false,
  reducedMotion: false,

  setCartOpen: (cartOpen) => set({ cartOpen }),
  openCart: () => set({ cartOpen: true, mobileNavOpen: false }),
  closeCart: () => set({ cartOpen: false }),

  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  toggleMobileNav: () => set({ mobileNavOpen: !get().mobileNavOpen }),

  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
}));
