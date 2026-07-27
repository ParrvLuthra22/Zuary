"use client";

import { useEffect } from "react";

import { useUIStore } from "@/stores/ui";

/**
 * Runs before first paint so a light-theme visitor never sees a graphite flash.
 * Mirrors the logic in stores/theme.ts: stored value wins, otherwise the OS.
 */
const NO_FLASH = `(function(){try{
var s=localStorage.getItem("zuary-theme");
var t=s?JSON.parse(s).state.theme:(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");
document.documentElement.dataset.theme=t;
document.documentElement.style.colorScheme=t;
}catch(e){}})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const setReducedMotion = useUIStore((s) => s.setReducedMotion);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [setReducedMotion]);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      {children}
    </>
  );
}
