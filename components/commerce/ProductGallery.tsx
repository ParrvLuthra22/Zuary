"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { Product } from "@/lib/data/products";
import { dur, easeOut } from "@/lib/motion/easing";
import { cn } from "@/lib/utils";

/** Desktop images fill the 58% column; mobile ones fill the viewport. */
const SIZES_ATTR = "(min-width: 768px) 58vw, 100vw";

/**
 * One set of frames for both layouts — a horizontal snap rail on mobile, a
 * vertical stack on desktop. Rendering the two separately would put every
 * image in the DOM twice, and `display: none` does not stop the browser
 * fetching them.
 */
export function ProductGallery({ product }: { product: Product }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onScroll = () => {
      if (rail.clientWidth === 0) return;
      const i = Math.round(rail.scrollLeft / rail.clientWidth);
      setActive(Math.min(product.images.length - 1, Math.max(0, i)));
    };
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => rail.removeEventListener("scroll", onScroll);
  }, [product.images.length]);

  return (
    <>
      <div
        ref={railRef}
        className="flex snap-x snap-mandatory overflow-x-auto md:block md:snap-none md:overflow-x-visible"
      >
        {product.images.map((src, i) => (
          <div
            key={src}
            className="w-full shrink-0 snap-center md:w-auto md:shrink"
          >
            <Frame product={product} src={src} index={i} priority={i < 2} />
          </div>
        ))}
      </div>

      {/* Counter belongs to the mobile rail only. */}
      <div className="flex items-center justify-between px-6 py-4 md:hidden">
        <div className="flex gap-1.5" aria-hidden>
          {product.images.map((src, i) => (
            <span
              key={src}
              className={cn(
                "h-1 w-5 rounded-full transition-colors duration-[--dur-micro]",
                i === active ? "bg-accent" : "bg-line",
              )}
            />
          ))}
        </div>
        <p className="t-label text-fg-muted">
          {active + 1} / {product.images.length}
        </p>
      </div>
    </>
  );
}

function Frame({
  product,
  src,
  index,
  priority,
}: {
  product: Product;
  src: string;
  index: number;
  priority: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      // The buy box clones the first frame for the fly-to-cart animation.
      data-gallery-frame={index}
      className="relative aspect-[4/5] w-full overflow-hidden"
      style={{ backgroundColor: product.swatch }}
    >
      {!failed ? (
        <Image
          src={src}
          alt={`${product.name} — view ${index + 1}`}
          fill
          priority={priority}
          loading={priority ? undefined : "lazy"}
          sizes={SIZES_ATTR}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}

      {/* A panel the colour of the page, wiped down off the frame. The rail
          scrolls sideways on mobile, so the wipe is a desktop gesture. */}
      <motion.span
        aria-hidden
        className="absolute inset-0 hidden origin-bottom bg-bg md:block"
        initial={{ scaleY: 1 }}
        whileInView={{ scaleY: 0 }}
        viewport={{ once: true, margin: "-8% 0px -8% 0px" }}
        transition={{ duration: dur.page, ease: [...easeOut] }}
      />
    </div>
  );
}
