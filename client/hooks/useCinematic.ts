"use client";

import "client-only";

import { useEffect, useState } from "react";

import { useUIStore } from "@/client/stores/ui";

/**
 * Whether this visitor gets the pinned, scrubbed treatment.
 *
 * Mobile and reduced motion both fall back to plain scroll sections with
 * whileInView fades — no pins, no scrubs, no parallax. Starts false so the
 * static version is what renders on the server and on first paint.
 */
export function useCinematic() {
  const reducedMotion = useUIStore((s) => s.reducedMotion);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return { cinematic: isDesktop && !reducedMotion, isDesktop, reducedMotion };
}

/** Loads GSAP only when the cinematic path is actually taken. */
export async function loadGsap() {
  const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
  ]);
  gsap.registerPlugin(ScrollTrigger);
  return { gsap, ScrollTrigger };
}
