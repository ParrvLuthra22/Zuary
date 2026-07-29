"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { loadGsap, useCinematic } from "@/components/drops/useCinematic";
import { ButtonZ } from "@/components/ui/button-z";
import type { Product } from "@/lib/data/products";
import { cn, formatINR, seriesLabel } from "@/lib/utils";
import { useNotifyStore } from "@/stores/notify";

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

  // Shot garments get a chapter each. The rest share one — three near-identical
  // empty chapters would read as three things missing rather than as two
  // things coming.
  const shot = products.filter((p) => p.status === "available");
  const unshot = products.filter((p) => p.status === "coming-soon");

  return (
    <div ref={rootRef}>
      {shot.map((product, i) => (
        <ProductChapter
          key={product.slug}
          product={product}
          flip={i % 2 === 1}
          cinematic={cinematic}
        />
      ))}

      {unshot.length > 0 ? (
        <ComingSoonChapter products={unshot} />
      ) : null}
    </div>
  );
}

/** One section for everything still in production, however many that is. */
function ComingSoonChapter({ products }: { products: Product[] }) {
  const open = useNotifyStore((s) => s.open);

  return (
    <section className="border-t border-line px-6 py-28 md:min-h-svh md:px-16 md:py-40">
      <div className="mx-auto flex h-full max-w-5xl flex-col justify-center">
        <p className="t-label text-accent-ink">Still on the table</p>

        <h2 className="t-display-lg mt-4">
          {products.length === 2 ? "Two more cuts." : "More cuts."}
        </h2>

        <div className="mt-16 grid gap-12 md:grid-cols-2 md:gap-16">
          {products.map((product) => (
            <div key={product.slug} className="border-t border-line pt-8">
              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="t-display-md">{product.name}</h3>
                <span className="t-deva text-lg text-fg-muted">
                  {product.deva}
                </span>
              </div>
              <p className="t-label mt-2 text-fg-muted">
                {product.devaMeaning}
              </p>

              <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5">
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
            </div>
          ))}
        </div>

        <p className="mt-16 max-w-md text-fg-muted">
          Both are cut and in production. Neither has been photographed, and we
          would rather show you nothing than show you something else.
        </p>

        <ButtonZ
          className="mt-8 self-start"
          onClick={() => open(products[0])}
        >
          Notify me
        </ButtonZ>
      </div>
    </section>
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
