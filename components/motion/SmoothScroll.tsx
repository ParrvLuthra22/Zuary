"use client";

import { ReactLenis } from "lenis/react";

import { useUIStore } from "@/stores/ui";

/**
 * Wraps the app in Lenis. Disabled outright when the visitor has asked for
 * reduced motion — hijacked scrolling is the first thing that setting means.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reducedMotion = useUIStore((s) => s.reducedMotion);

  if (reducedMotion) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.09,
        wheelMultiplier: 1,
        touchMultiplier: 1.6,
        smoothWheel: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
