"use client";

import { useEffect, useRef, useState } from "react";

import { RevealText } from "@/components/motion/RevealText";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui";

type Plate = {
  src: string;
  caption: string;
  /** Describes the shot; the caption is a one-word label, not alt text. */
  alt: string;
  /** Desktop placement — alternating sides, each sitting lower than the last. */
  className: string;
};

/**
 * There is no separate /material/ shoot, so these are the REEH macros — the
 * three frames that are already close enough to read as material rather than
 * as product. Alt text comes from the product's own imageAlts so the two
 * never drift apart.
 */
const PLATES: Plate[] = [
  {
    src: "/products/reeh/03.webp",
    caption: "Tag",
    alt: "Waistband detail — side-adjuster tab, belt loop and ZUARY triangle label",
    className: "md:mr-auto",
  },
  {
    src: "/products/reeh/04.webp",
    caption: "Pleat",
    alt: "Single forward pleat and slant pocket construction",
    className: "md:ml-auto md:mt-24",
  },
  {
    src: "/products/reeh/05.webp",
    caption: "Hem",
    alt: "Turn-up hem detail",
    className: "md:mr-auto md:mt-24",
  },
];

/** Colour arrives as a plate's top crosses 60% → 40% of the viewport. */
const GREY_AT = 0.6;
const COLOUR_AT = 0.4;

export function MaterialScroll() {
  const reducedMotion = useUIStore((s) => s.reducedMotion);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const root = rootRef.current;
    if (!root) return;

    const plates = Array.from(
      root.querySelectorAll<HTMLElement>("[data-material-plate]"),
    );

    /*
     * Read live rects rather than cached ScrollTrigger start/end values. Two
     * pinned sections above this one add their spacer height as they mount,
     * which moves every plate; anything measured before that lands is wrong,
     * and refreshing late fights Lenis for the scroll position.
     */
    let frame = 0;
    const paint = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const plate of plates) {
        const pct = plate.getBoundingClientRect().top / vh;
        const p = Math.max(
          0,
          Math.min(1, (GREY_AT - pct) / (GREY_AT - COLOUR_AT)),
        );
        plate.style.filter = `grayscale(${1 - p}) contrast(${1.1 - 0.1 * p})`;
      }
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reducedMotion]);

  return (
    <section ref={rootRef} className="px-6 py-24 md:px-12 md:py-32">
      <RevealText as="h2" className="t-display-lg max-w-3xl">
        We start at the seam.
      </RevealText>

      <MaterialPlate plate={PLATES[0]} reducedMotion={reducedMotion} />

      <RevealText
        as="h2"
        className="t-display-lg mt-20 max-w-3xl text-accent-ink md:mt-32"
      >
        Not the logo.
      </RevealText>

      <MaterialPlate plate={PLATES[1]} reducedMotion={reducedMotion} />
      <MaterialPlate plate={PLATES[2]} reducedMotion={reducedMotion} />
    </section>
  );
}

function MaterialPlate({
  plate,
  reducedMotion,
}: {
  plate: Plate;
  reducedMotion: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <figure className={cn("mt-16 w-full md:w-[40vw]", plate.className)}>
      <div
        data-material-plate
        className="relative aspect-[4/5] w-full overflow-hidden rounded-sm border border-line bg-bg-raised"
        style={{
          // Reduced motion holds the end state rather than the grey opener.
          filter: reducedMotion ? "none" : "grayscale(1) contrast(1.1)",
        }}
      >
        {!failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={plate.src}
            alt={plate.alt}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : null}
      </div>

      <figcaption className="t-label mt-3 text-fg-muted">
        {plate.caption}
      </figcaption>
    </figure>
  );
}
