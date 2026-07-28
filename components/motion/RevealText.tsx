"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { dur, easeOut } from "@/lib/motion/easing";
import { inView } from "@/lib/motion/variants";

type RevealTextProps = {
  children: string;
  /** Split point. Words reads better for headlines, lines for paragraphs. */
  by?: "word" | "line";
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  delay?: number;
  /** Per-character travel time. Homepage sections cap section motion at 600ms. */
  duration?: number;
};

/**
 * Wipes text up from a clipped baseline, one word (or line) at a time. Each
 * unit needs its own overflow-hidden box, which is why this splits rather than
 * animating the block.
 */
export function RevealText({
  children,
  by = "word",
  className,
  as = "div",
  delay = 0,
  duration = dur.mid,
}: RevealTextProps) {
  const units = by === "word" ? children.split(" ") : children.split("\n");
  const Tag = motion[as];

  return (
    <Tag
      className={cn(
        "inline-flex flex-wrap gap-x-[0.25em]",
        by === "line" && "flex-col gap-x-0",
        className,
      )}
      initial="hidden"
      whileInView="visible"
      viewport={inView}
      transition={{ staggerChildren: 0.05, delayChildren: delay }}
      aria-label={children}
    >
      {units.map((unit, i) => (
        <span key={`${unit}-${i}`} className="overflow-hidden" aria-hidden>
          <motion.span
            className="inline-block will-change-transform"
            variants={{
              hidden: { y: "110%" },
              visible: { y: "0%" },
            }}
            transition={{ duration, ease: [...easeOut] }}
          >
            {unit}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
