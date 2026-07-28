"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

import { TriangleA } from "@/components/layout/Wordmark";
import { loadGsap, useCinematic } from "@/components/drops/useCinematic";
import { dur, easeOut } from "@/lib/motion/easing";
import { inView } from "@/lib/motion/variants";

const LINES = [
  "A trouser is not a basic.",
  "It is the line of the body.",
  "We start there.",
];

export function ChapterManifesto() {
  const { cinematic } = useCinematic();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!cinematic) return;
    const section = sectionRef.current;
    if (!section) return;

    let disposed = false;
    let revert: (() => void) | undefined;

    (async () => {
      const { gsap, ScrollTrigger } = await loadGsap();
      if (disposed) return;

      const ctx = gsap.context(() => {
        const lines = gsap.utils.toArray<HTMLElement>("[data-manifesto-line]");
        // Each line owns an equal slice of the pin: wipe in, hold, wipe out.
        const slice = 1 / lines.length;

        const trigger = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: "+=150%",
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            lines.forEach((line, i) => {
              const local = (self.progress - i * slice) / slice;
              // 0 → 1 in, hold, 1 → 0 out. Only one is ever above zero.
              const shown =
                local < 0 || local > 1
                  ? 0
                  : local < 0.25
                    ? local / 0.25
                    : local > 0.75
                      ? (1 - local) / 0.25
                      : 1;
              line.style.opacity = String(shown);
              line.style.clipPath = `inset(${(1 - shown) * 100}% 0% 0% 0%)`;
            });
          },
        });

        ScrollTrigger.refresh();
        return () => trigger.kill();
      }, section);

      revert = () => ctx.revert();
    })();

    return () => {
      disposed = true;
      revert?.();
    };
  }, [cinematic]);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-svh items-center justify-center overflow-hidden bg-bg px-6"
    >
      <TriangleA className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[zuary-rotate_90s_linear_infinite] text-[34rem] opacity-6 motion-reduce:animate-none" />

      {cinematic ? (
        <div className="relative z-10 w-full">
          {LINES.map((line) => (
            <p
              key={line}
              data-manifesto-line
              style={{ opacity: 0 }}
              className="t-display-lg absolute inset-x-0 text-center"
            >
              {line}
            </p>
          ))}
        </div>
      ) : (
        // Mobile and reduced motion: stacked, each fading in on its own.
        <div className="relative z-10 flex flex-col gap-14 py-24">
          {LINES.map((line) => (
            <motion.p
              key={line}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={inView}
              transition={{ duration: dur.mid, ease: [...easeOut] }}
              className="t-display-lg text-center"
            >
              {line}
            </motion.p>
          ))}
        </div>
      )}
    </section>
  );
}
