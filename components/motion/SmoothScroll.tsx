"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { createContext, useContext, useEffect, useRef, useState } from "react";

import { useUIStore } from "@/stores/ui";

const LenisContext = createContext<Lenis | null>(null);

/** The live Lenis instance, or null when smooth scroll is off. */
export const useLenis = () => useContext(LenisContext);

/**
 * Scrolls to the top through Lenis when it is running, natively otherwise.
 * Route changes must not animate the jump — the panel is already covering.
 */
export function scrollToTop(lenis: Lenis | null) {
  if (lenis) {
    lenis.scrollTo(0, { immediate: true });
    return;
  }
  window.scrollTo(0, 0);
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reducedMotion = useUIStore((s) => s.reducedMotion);
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Hijacked scrolling is the first thing reduced motion should switch off.
    if (
      reducedMotion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const instance = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Touch keeps native scrolling — smoothing it fights the OS.
      syncTouch: false,
      // GSAP's ticker drives the loop instead, so the two never run out of step.
      autoRaf: false,
    });

    lenisRef.current = instance;
    setLenis(instance);

    gsap.registerPlugin(ScrollTrigger);
    instance.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      instance.off("scroll", ScrollTrigger.update);
      instance.destroy();
      lenisRef.current = null;
      setLenis(null);
    };
  }, [reducedMotion]);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
