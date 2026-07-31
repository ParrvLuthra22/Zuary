import type { Variants } from "framer-motion";

import { dur, easeOut } from "./easing";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: dur.mid, ease: easeOut },
  },
};

export const staggerParent: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

/**
 * Wipes a block in from the bottom. Pair with an overflow-hidden wrapper so the
 * clipped edge reads as a mask rather than a fade.
 */
export const maskReveal: Variants = {
  hidden: { clipPath: "inset(100% 0% 0% 0%)", y: "12%" },
  visible: {
    clipPath: "inset(0% 0% 0% 0%)",
    y: "0%",
    transition: { duration: dur.slow, ease: easeOut },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: dur.fast, ease: easeOut },
  },
};

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: dur.page, ease: easeOut },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: dur.fast, ease: easeOut },
  },
};

/** Default viewport config — fire once, a little before the block is centred. */
export const inView = { once: true, margin: "-12% 0px -12% 0px" } as const;
