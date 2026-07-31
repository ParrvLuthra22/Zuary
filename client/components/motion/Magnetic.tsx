"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRef } from "react";

import { useUIStore } from "@/client/stores/ui";

type MagneticProps = {
  children: React.ReactNode;
  /** How far the element is allowed to travel, in px. */
  strength?: number;
  className?: string;
};

/** Pulls its child toward the cursor while the pointer is inside it. */
export function Magnetic({
  children,
  strength = 12,
  className,
}: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = useUIStore((s) => s.reducedMotion);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 180, damping: 18, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 180, damping: 18, mass: 0.4 });

  function handleMove(event: React.MouseEvent<HTMLSpanElement>) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const offsetX = event.clientX - (rect.left + rect.width / 2);
    const offsetY = event.clientY - (rect.top + rect.height / 2);
    x.set((offsetX / (rect.width / 2)) * strength);
    y.set((offsetY / (rect.height / 2)) * strength);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  if (reducedMotion) return <span className={className}>{children}</span>;

  return (
    <motion.span
      ref={ref}
      className={className}
      style={{ x: springX, y: springY, display: "inline-block" }}
      onMouseMove={handleMove}
      onMouseLeave={reset}
    >
      {children}
    </motion.span>
  );
}
