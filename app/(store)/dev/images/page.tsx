import type { Metadata } from "next";

import { ProductImage } from "@/components/commerce/ProductImage";
import { getProduct } from "@/lib/data/products";

/**
 * TEMPORARY — delete at the end of P-IMG-02.
 *
 * The only thing this page is for: proving the photography backdrop and the
 * page backdrop are the same surface. Scroll it in dark mode and you should
 * not be able to say where any frame ends. Toggle to light and every frame
 * should pick up a hairline instead.
 */
export const metadata: Metadata = {
  title: "Image check",
  robots: { index: false, follow: false },
};

const reeh = getProduct("reeh");

export default function DevImagesPage() {
  if (!reeh?.hasPhotography) {
    return (
      <main className="px-6 py-32">
        <p className="t-label text-fg-muted">No REEH photography to check.</p>
      </main>
    );
  }

  const frames = reeh.images.map((src, i) => ({
    src,
    alt: reeh.imageAlts?.[i] ?? "",
    blurKey: `reeh-0${i + 1}`,
    label: `0${i + 1}`,
  }));

  const first = frames[0];

  return (
    <main className="pb-40 pt-28">
      <header className="px-6 md:px-12">
        <p className="t-label text-fg-muted">Dev — not linked, not indexed</p>
        <h1 className="t-display-md mt-3">Image coherence check</h1>
        <p className="mt-4 max-w-prose text-sm text-fg-muted">
          Six REEH frames on the page background, edge to edge. In dark mode
          there should be no visible rectangle anywhere below — no seam, no
          corner, no change of tone where a photo starts. Toggle the theme and
          every frame should gain a hairline.
        </p>
      </header>

      {/* All six, three across, no gutters — adjacent frames make a seam
          obvious the moment one is even slightly off. */}
      <section className="mt-16">
        <h2 className="t-label px-6 text-fg-muted md:px-12">
          All six frames · 3 columns
        </h2>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {frames.map((frame, i) => (
            <figure key={frame.src} className="relative">
              <ProductImage
                src={frame.src}
                alt={frame.alt}
                blurKey={frame.blurKey}
                priority={i < 3}
              />
              <figcaption className="t-label absolute left-3 top-3 text-fg-muted mix-blend-difference">
                {frame.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* The shop grid renders three cards in a row. Same frame three times,
          so any edge shows up as repetition rather than as subject matter. */}
      <section className="mt-24">
        <h2 className="t-label px-6 text-fg-muted md:px-12">
          Shop-grid simulation · frame 01 × 3
        </h2>
        <div className="mt-6 grid grid-cols-3">
          {[0, 1, 2].map((n) => (
            <ProductImage
              key={n}
              src={first.src}
              alt={n === 0 ? first.alt : ""}
              blurKey={first.blurKey}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
