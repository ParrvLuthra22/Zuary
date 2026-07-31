"use client";

import { motion } from "framer-motion";

import { cn } from "@/shared/utils";
import { dur, easeOut } from "@/shared/motion/easing";
import { inView } from "@/shared/motion/variants";

type RevealTextProps = {
  children: string;
  /** Split point. Words for headlines, lines for paragraphs, chars for titles. */
  by?: "word" | "line" | "char";
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  delay?: number;
  /** Per-character travel time. Homepage sections cap section motion at 600ms. */
  duration?: number;
  /** Seconds between units. */
  stagger?: number;
};

/**
 * Wipes text up from a clipped baseline, one unit at a time. Each unit needs
 * its own overflow-hidden box, which is why this splits rather than animating
 * the block.
 */
export function RevealText({
  children,
  by = "word",
  className,
  as = "div",
  delay = 0,
  duration = dur.mid,
  stagger = 0.05,
}: RevealTextProps) {
  const units =
    by === "word"
      ? children.split(" ")
      : by === "line"
        ? children.split("\n")
        : [...children];

  const Tag = motion[as];

  return (
    <Tag
      className={cn(
        "inline-flex flex-wrap",
        by === "word" && "gap-x-[0.25em]",
        by === "line" && "flex-col",
        className,
      )}
      initial="hidden"
      whileInView="visible"
      viewport={inView}
      transition={{ staggerChildren: stagger, delayChildren: delay }}
      aria-label={children}
    >
      {units.map((unit, i) => {
        // A clipped space collapses, so give it width and let it through.
        if (by === "char" && unit === " ") {
          return (
            <span key={`sp-${i}`} aria-hidden className="inline-block w-[0.28em]" />
          );
        }
        return (
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
        );
      })}
    </Tag>
  );
}
