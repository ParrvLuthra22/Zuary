"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { loadGsap, useCinematic } from "@/client/hooks/useCinematic";
import { ButtonZ } from "@/client/components/ui/button-z";
import type { Product } from "@/shared/constants/products";
import { cn, formatINR, seriesLabel } from "@/shared/utils";

export function ChapterProducts({ products }: { products: Product[] }) {
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
        const frames = gsap.utils.toArray<HTMLElement>("[data-parallax]");

        // Sticky handles the hold; this only drifts the image inside its frame.
        const triggers = frames.map((frame) =>
          ScrollTrigger.create({
            trigger: frame,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const img = frame.querySelector<HTMLElement>("[data-parallax-img]");
              if (img) img.style.translate = `0 ${-12 * self.progress}%`;
            },
          }),
        );

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

  // All three are shot, so every trouser gets its own chapter again. The
  // combined "Two more cuts." section that stood in while KOHL and DHOOL were
  // unphotographed is gone.
  return (
    <div ref={rootRef}>
      {products.map((product, i) => (
        <ProductChapter
          key={product.slug}
          product={product}
          flip={i % 2 === 1}
          cinematic={cinematic}
        />
      ))}
    </div>
  );
}

function ProductChapter({
  product,
  flip,
  cinematic,
}: {
  product: Product;
  flip: boolean;
  cinematic: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <section className="border-t border-line md:min-h-svh">
      <div
        // items-stretch (the default), not items-start: the image column has
        // to be as tall as the section or the sticky frame has no room to
        // travel and never actually sticks.
        className={cn("md:flex", flip && "md:flex-row-reverse")}
      >
        <div className="md:w-1/2">
          <div
            data-parallax
            className={cn(
              "relative w-full overflow-hidden",
              cinematic ? "md:sticky md:top-24 md:h-[80vh]" : "aspect-[4/5]",
            )}
            style={{ backgroundColor: product.swatch }}
          >
            {product.images[0] && !failed ? (
              <div
                data-parallax-img
                className="absolute inset-0 will-change-transform"
                // Overscan so the drift never exposes an edge.
                style={{ height: "115%" }}
              >
                <Image
                  src={product.images[0]}
                  alt={
                    product.imageAlts?.[0] ??
                    `${product.name}, ${product.colour} ${product.fit} trousers`
                  }
                  fill
                  loading="lazy"
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                  onError={() => setFailed(true)}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-20 md:min-h-svh md:w-1/2 md:px-16">
          <p className="t-label text-accent-ink">{seriesLabel(product.series)}</p>

          <h2 className="t-display-lg mt-4">{product.name}</h2>

          <p className="mt-3">
            <span className="t-deva text-xl text-fg-muted">{product.deva}</span>
            <span className="ml-3 text-sm text-fg-muted">
              {product.devaMeaning}
            </span>
          </p>

          <p className="mt-8 max-w-md text-fg-muted">{product.description}</p>

          <dl className="mt-10 grid max-w-md grid-cols-2 gap-x-8 gap-y-5 border-y border-line py-6">
            {[
              ["Fit", product.fit],
              ["Weight", product.weight],
              ["Fabric", product.fabric],
              ["Mill", product.mill],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="t-label text-fg-muted">{label}</dt>
                <dd className="mt-1 text-sm text-fg capitalize">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="t-display-sm mt-8">{formatINR(product.price)}</p>

          <ButtonZ asChild className="mt-8 self-start">
            <Link href={`/products/${product.slug}`}>View →</Link>
          </ButtonZ>
        </div>
      </div>
    </section>
  );
}
