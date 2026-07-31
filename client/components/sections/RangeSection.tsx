"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { loadGsap, useCinematic } from "@/client/hooks/useCinematic";
import { ButtonZ } from "@/client/components/ui/button-z";
import { BLUR } from "@/shared/constants/blur";
import { availableProducts } from "@/shared/constants/products";
import { inView, maskReveal } from "@/shared/motion/variants";

const COUNT_WORD = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];

/** Colourways in the grid shot, only some of which are in production. */
const COLOURWAYS_SHOT = 12;

/**
 * The twelve-colourway overhead.
 *
 * This image is a range statement, not an assortment. Nine of the twelve
 * colours are development samples we do not sell, so the section is written
 * forward-looking on purpose and carries a live count read straight from the
 * catalogue — if a fourth colourway goes live the sentence updates itself
 * rather than quietly becoming a lie.
 *
 * Two rules for whoever moves this: it must never sit beside an add-to-bag
 * control, and the "available now" number must stay derived. Its home on the
 * homepage is between the material section and the drop bridge, which is the
 * one stretch of that page with no buy controls in it.
 */
export function RangeSection() {
  const { cinematic } = useCinematic();
  const sectionRef = useRef<HTMLElement>(null);
  const liveCount = availableProducts().length;

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
        const media = section.querySelector<HTMLElement>("[data-range-media]");

        const trigger = ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (!media) return;
            // Symmetric drift: +4% entering, -4% leaving, for the 8% of travel
            // the brief asks for. Centring it this way means the middle of the
            // image is what is on screen while the section is actually being
            // read, rather than the top edge.
            media.style.translate = `0 ${4 - 8 * self.progress}%`;
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
    <section ref={sectionRef} className="relative w-full">
      <motion.div
        variants={maskReveal}
        initial="hidden"
        whileInView="visible"
        viewport={inView}
        // 4:3 on phones so twelve trousers are still legible at that width;
        // the shot's native 16:9 from md up.
        className="relative aspect-[4/3] w-full overflow-hidden bg-bg md:aspect-[16/9]"
      >
        <div
          data-range-media
          className="absolute inset-0 will-change-transform"
          // Overscan pays for the parallax travel. Without it the drift would
          // expose the page behind the top or bottom edge.
          style={cinematic ? { height: "108%", top: "-4%" } : undefined}
        >
          <Image
            src="/lookbook/grid.webp"
            alt={`Twelve folded trousers in twelve colourways, arranged three by four and shot from overhead. ${COUNT_WORD[liveCount]} of the ${COUNT_WORD[COLOURWAYS_SHOT].toLowerCase()} are in production; the rest are development samples.`}
            fill
            loading="lazy"
            sizes="100vw"
            placeholder="blur"
            blurDataURL={BLUR["lookbook-grid"]}
            className="object-cover"
          />
        </div>

        {/* Scrim — the grid's mid-tones sit right where the type does. */}
        <div className="absolute inset-0 bg-carbon/55" aria-hidden />

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
          {/* text-accent, not accent-ink: the scrim is dark in both themes, so
              the light theme's darkened ink would fail against it. */}
          <p className="t-label text-accent">The range</p>

          <h2 className="t-display-md text-off-white">
            {COUNT_WORD[COLOURWAYS_SHOT]} colours. One cut.
          </h2>

          <p className="max-w-md text-off-white/75">
            {COUNT_WORD[liveCount]} available now. The rest land through the
            year.
          </p>

          {/* Pinned to the light-on-dark pair for the same reason as the
              label — this sits on the scrim, not on the page. */}
          <ButtonZ
            asChild
            variant="outline"
            className="mt-2 border-off-white/35 text-off-white hover:border-accent hover:text-accent"
          >
            <Link href="/shop">See what&rsquo;s live →</Link>
          </ButtonZ>
        </div>
      </motion.div>
    </section>
  );
}
