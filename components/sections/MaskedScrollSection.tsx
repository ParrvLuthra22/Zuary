"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui";

type MaskedScrollSectionProps = {
  /** Sits behind the mask — usually an image or a video. */
  media: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

/**
 * Opens a rectangular window over a pinned backdrop as you scroll through it,
 * then closes it again on the way out.
 */
export function MaskedScrollSection({
  media,
  children,
  className,
}: MaskedScrollSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useUIStore((s) => s.reducedMotion);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const inset = useTransform(scrollYProgress, [0, 0.5, 1], [38, 0, 38]);
  const clipPath = useTransform(
    inset,
    (value) => `inset(${value}% ${value / 2}% round 2px)`,
  );
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.12, 1, 1.12]);

  return (
    <section ref={ref} className={cn("relative h-[180vh]", className)}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={reducedMotion ? undefined : { clipPath }}
        >
          <motion.div
            className="h-full w-full"
            style={reducedMotion ? undefined : { scale }}
          >
            {media}
          </motion.div>
        </motion.div>

        {children ? (
          <div className="relative z-10 flex h-full items-end p-6 md:p-12">
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
