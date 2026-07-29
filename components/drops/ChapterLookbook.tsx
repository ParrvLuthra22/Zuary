"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

import { BLUR } from "@/lib/data/blur";
import type { LookbookImage, LookbookSpan } from "@/lib/data/drops";
import { dur, easeOut } from "@/lib/motion/easing";
import { cn } from "@/lib/utils";

/** Mobile is always one column; the span only applies from md up. */
const SPAN_CLASS: Record<LookbookSpan, string> = {
  full: "md:col-span-12 aspect-[16/9]",
  half: "md:col-span-6 aspect-[4/5]",
  third: "md:col-span-4 aspect-square",
};

const SIZES: Record<LookbookSpan, string> = {
  full: "100vw",
  half: "(min-width: 768px) 50vw, 100vw",
  third: "(min-width: 768px) 33vw, 100vw",
};

export function ChapterLookbook({ images }: { images: LookbookImage[] }) {
  return (
    <section className="border-t border-line py-24">
      {/* The chapter opens on the twelve-colourway grid. Its caption states the
          ratio outright: this is the range, not the assortment, and only three
          of the twelve in the shot are trousers you can buy. */}
      <figure className="w-full">
        <motion.div
          initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
          whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
          viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
          transition={{ duration: dur.slow, ease: [...easeOut] }}
          className="relative aspect-[4/3] w-full overflow-hidden bg-bg md:aspect-[16/9]"
        >
          <Image
            src="/lookbook/grid.webp"
            alt="Twelve folded trousers in twelve colourways, arranged three by four and shot from overhead. Three of the twelve are in production; the rest are development samples."
            fill
            loading="lazy"
            sizes="100vw"
            placeholder="blur"
            blurDataURL={BLUR["lookbook-grid"]}
            className="object-cover"
          />
        </motion.div>
        <figcaption className="t-label mt-3 px-6 text-fg-muted md:px-12">
          Drop 01 — three of twelve
        </figcaption>
      </figure>

      {/* The location shoot still has not happened, so this half stays out
          rather than printing a heading over an empty grid. Set hasLookbook on
          the drop and it returns. */}
      {images.length > 0 ? (
        <div className="px-6 md:px-12">
          <p className="t-label mt-24 text-accent-ink">Lookbook</p>
          <h2 className="t-display-md mt-3">Shot on location.</h2>

          <div className="mt-12 grid grid-cols-1 gap-2 md:grid-cols-12">
            {images.map((image, i) => (
              <Plate key={image.src} image={image} priority={i === 0} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Plate({
  image,
  priority,
}: {
  image: LookbookImage;
  priority: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <motion.figure
      initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: dur.slow, ease: [...easeOut] }}
      className={cn(
        "group relative col-span-1 overflow-hidden bg-bg-raised",
        SPAN_CLASS[image.span],
      )}
    >
      {!failed ? (
        <Image
          src={image.src}
          alt={image.caption}
          fill
          priority={priority}
          loading={priority ? undefined : "lazy"}
          sizes={SIZES[image.span]}
          className="object-cover transition-transform duration-[--dur-mid] ease-[--ease-out] group-hover:scale-[1.03]"
          onError={() => setFailed(true)}
        />
      ) : null}

      {/* Caption is a desktop hover affordance; there is no hover on mobile. */}
      <figcaption
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 hidden p-4 md:block",
          "t-label translate-y-full text-accent-ink opacity-0",
          "transition-[translate,opacity] duration-[--dur-fast] ease-[--ease-out]",
          "group-hover:translate-y-0 group-hover:opacity-100",
        )}
      >
        {image.caption}
      </figcaption>
    </motion.figure>
  );
}
