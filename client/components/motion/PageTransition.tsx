"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { usePathname } from "next/navigation";

import { scrollToTop, useLenis } from "@/client/components/motion/SmoothScroll";
import { easeInOut } from "@/shared/motion/easing";
import { useUIStore } from "@/client/stores/ui";

const SWEEP = 0.35;

/** Grows up from the bottom to cover, retracts to the top to reveal. */
const panel: Variants = {
  enter: { scaleY: 1, originY: 0 },
  center: {
    scaleY: 0,
    originY: 0,
    transition: { duration: SWEEP, ease: [...easeInOut] },
  },
  exit: {
    scaleY: 1,
    originY: 1,
    transition: { duration: SWEEP, ease: [...easeInOut] },
  },
};

/** Rides the panel: 0 → 1 as it covers, 1 → 0 as it clears. */
const mark: Variants = {
  enter: { opacity: 1 },
  center: { opacity: 0, transition: { duration: SWEEP * 0.7, ease: [...easeInOut] } },
  exit: { opacity: 1, transition: { duration: SWEEP * 0.7, ease: [...easeInOut] } },
};

const content: Variants = {
  enter: { opacity: 0 },
  center: {
    opacity: 1,
    // Starts just after the panel begins retracting, so the page is already
    // there as it is uncovered rather than appearing into an empty screen.
    transition: { duration: 0.32, delay: 0.12, ease: [...easeInOut] },
  },
  exit: { opacity: 1 },
};

const fade: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = useUIStore((s) => s.reducedMotion);
  const lenis = useLenis();

  // Checkout must feel instant — no sweep between the form and payment.
  const instant = reducedMotion || pathname.startsWith("/checkout");

  if (instant) {
    return (
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          variants={fade}
          initial="enter"
          animate="center"
          exit="exit"
          onAnimationStart={() => scrollToTop(lenis)}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence
      mode="wait"
      initial={false}
      // Fires once the outgoing page's panel has fully covered the viewport,
      // so the jump to the top is never visible.
      onExitComplete={() => scrollToTop(lenis)}
    >
      <motion.div
        key={pathname}
        initial="enter"
        animate="center"
        exit="exit"
      >
        <motion.div
          variants={panel}
          className="pointer-events-none fixed inset-0 z-[80] bg-accent"
          aria-hidden
        />

        <motion.div
          variants={mark}
          className="pointer-events-none fixed inset-0 z-[81] grid place-items-center"
          aria-hidden
        >
          <span className="t-display-md text-carbon">
            ZU<span className="mx-[0.04em]">▲</span>RY
          </span>
        </motion.div>

        <motion.div variants={content}>{children}</motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
