"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Theme = "dark" | "light";

type ThemeState = {
  theme: Theme;
  /** False until the persisted value has been read back from storage. */
  hydrated: boolean;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
  _hydrate: () => void;
};

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function systemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      hydrated: false,

      setTheme: (theme) => {
        apply(theme);
        set({ theme });
      },

      toggle: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),

      _hydrate: () => set({ hydrated: true }),
    }),
    {
      name: "zuary-theme",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return;
        // Nothing stored yet means this is a first visit — follow the OS.
        const stored = localStorage.getItem("zuary-theme");
        const theme = stored ? state.theme : systemTheme();
        state.setTheme(theme);
        state._hydrate();
      },
    },
  ),
);
