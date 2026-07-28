"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

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
    <section className="border-t border-line px-6 py-24 md:px-12">
      <p className="t-label text-accent-ink">Lookbook</p>
      <h2 className="t-display-md mt-3">Shot on location.</h2>

      <div className="mt-12 grid grid-cols-1 gap-2 md:grid-cols-12">
        {images.map((image, i) => (
          <Plate key={image.src} image={image} priority={i === 0} />
        ))}
      </div>
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
