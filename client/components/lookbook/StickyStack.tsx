"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { loadGsap, useCinematic } from "@/client/hooks/useCinematic";
import type { LookbookImage } from "@/shared/constants/drops";
import { getProduct } from "@/shared/constants/products";
import { cn } from "@/shared/utils";

/**
 * Sticky stacking: every frame is `sticky top-0 h-screen`, so each one comes to
 * rest at the top and the next scrolls up over it. CSS does the stacking on its
 * own — GSAP only scales and dims the frame underneath as it gets covered,
 * driven by the *next* frame's position so the two stay in lockstep.
 */
export function StickyStack({
  images,
  total,
  offset = 0,
}: {
  images: LookbookImage[];
  total: number;
  offset?: number;
}) {
  const { cinematic } = useCinematic();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cinematic) return;
    const root = rootRef.current;
    if (!root) return;

    let disposed = false;
    let revert: (() => void) | undefined;

    (async () => {
      const { gsap, ScrollTrigger } = await loadGsap();
      if (disposed) return;

      const ctx = gsap.context(() => {
        const frames = gsap.utils.toArray<HTMLElement>("[data-stack-frame]");

        const triggers = frames.slice(0, -1).map((frame, i) => {
          const next = frames[i + 1];
          const inner = frame.querySelector<HTMLElement>("[data-stack-inner]");
          const dim = frame.querySelector<HTMLElement>("[data-stack-dim]");

          // Runs exactly while the next frame travels from the bottom of the
          // viewport to the top — the window in which it covers this one.
          return ScrollTrigger.create({
            trigger: next,
            start: "top bottom",
            end: "top top",
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const p = self.progress;
              if (inner) inner.style.scale = String(1 - 0.06 * p);
              if (dim) dim.style.opacity = String(0.6 * p);
            },
          });
        });

        ScrollTrigger.refresh();
        return () => triggers.forEach((t) => t.kill());
      }, root);

      revert = () => ctx.revert();
    })();

    return () => {
      disposed = true;
      revert?.();
    };
  }, [cinematic]);

  return (
    <div ref={rootRef}>
      {images.map((image, i) => (
        <Frame
          key={image.src}
          image={image}
          index={offset + i + 1}
          total={total}
          priority={i === 0}
          cinematic={cinematic}
        />
      ))}
    </div>
  );
}

function Frame({
  image,
  index,
  total,
  priority,
  cinematic,
}: {
  image: LookbookImage;
  index: number;
  total: number;
  priority: boolean;
  cinematic: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const product = image.product ? getProduct(image.product) : undefined;

  return (
    <section
      data-stack-frame
      className={cn(
        "w-full",
        // Mobile drops the stacking entirely: 80vh frames, captions below.
        cinematic ? "sticky top-0 h-svh overflow-hidden" : "relative",
      )}
    >
      <div
        data-stack-inner
        className={cn(
          "relative w-full origin-center overflow-hidden bg-bg-raised",
          cinematic ? "h-full" : "h-[80svh]",
        )}
      >
        {!failed ? (
          <Image
            src={image.src}
            alt={image.caption}
            fill
            priority={priority}
            loading={priority ? undefined : "lazy"}
            sizes="100vw"
            className="object-cover"
            onError={() => setFailed(true)}
          />
        ) : null}

        {/* Scrim: the caption has to stay readable over any photograph. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-carbon/90 via-carbon/50 to-transparent"
        />

        {/* Dimmer, driven by the frame above as it covers this one. */}
        <div
          data-stack-dim
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-carbon"
          style={{ opacity: 0 }}
        />

        {cinematic ? (
          <Caption image={image} index={index} total={total} product={product} />
        ) : null}
      </div>

      {!cinematic ? (
        <div className="px-6 py-6">
          <Caption
            image={image}
            index={index}
            total={total}
            product={product}
            inline
          />
        </div>
      ) : null}
    </section>
  );
}

function Caption({
  image,
  index,
  total,
  product,
  inline = false,
}: {
  image: LookbookImage;
  index: number;
  total: number;
  product?: ReturnType<typeof getProduct>;
  inline?: boolean;
}) {
  return (
    <figcaption
      className={cn(
        "z-10 max-w-sm",
        inline ? "" : "absolute bottom-0 left-0 p-6 md:p-12",
      )}
    >
      <p className="t-label text-accent-ink">
        {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </p>
      <p className={cn("mt-3 text-lg", inline ? "text-fg" : "text-off-white")}>
        {image.caption}
      </p>
      {product ? (
        <Link
          href={`/products/${product.slug}`}
          className="t-label mt-3 inline-block text-accent-ink hover:underline"
        >
          {product.name} →
        </Link>
      ) : null}
    </figcaption>
  );
}
