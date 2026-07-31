/**
 * PARKED — this is the lookbook page, intact, one rename away from live.
 *
 * /public/lookbook/the-trouser-trio is empty, so shipping this rendered ten
 * broken frames. It is filed as `_parked-page.tsx` rather than `page.tsx` so
 * Next does not route it: /lookbook now hits the app's not-found boundary and
 * answers a real 404. Calling notFound() from a prerendered page.tsx instead
 * gives a *soft* 404 — the 404 body served with a 200 — which is precisely
 * what the dynamicParams comments elsewhere in this app exist to prevent.
 *
 * To bring it back when the shoot lands:
 *   1. rename this file to page.tsx
 *   2. put { href: "/lookbook", label: "LOOKBOOK" } back in NAV_LINKS
 *   3. put /lookbook back in app/sitemap.ts
 *   4. set hasLookbook: true on the drop in lib/data/drops.ts
 *
 * StickyStack and LookbookGrid were never touched.
 */
import type { Metadata } from "next";

import { ProductCard } from "@/client/components/commerce/ProductCard";
import { LookbookGrid } from "@/client/components/lookbook/LookbookGrid";
import { StickyStack } from "@/client/components/lookbook/StickyStack";
import { RevealText } from "@/client/components/motion/RevealText";
import { currentDrop } from "@/shared/constants/drops";
import { PRODUCTS } from "@/shared/constants/products";
import { pageMetadata } from "@/shared/constants/site";

export const metadata: Metadata = pageMetadata({
  title: "Lookbook",
  description: "Drop 01, shot on location in Tamil Nadu and Rajasthan.",
  path: "/lookbook",
  type: "article",
});

/** The first run stacks; everything after it falls into the grid. */
const STACK_COUNT = 5;

export default function LookbookPage() {
  const all = currentDrop.lookbookImages;
  const stacked = all.slice(0, STACK_COUNT);
  const gridded = all.slice(STACK_COUNT);

  const products = PRODUCTS.filter((p) => currentDrop.products.includes(p.slug));

  return (
    <div className="pb-24">
      <header className="px-6 pt-8 pb-16 md:px-12">
        <p className="t-label text-accent-ink">Lookbook</p>
        <RevealText as="h1" className="t-display-lg mt-4">
          Drop 01.
        </RevealText>
        <p className="mt-5 max-w-md text-lg text-fg-muted">
          Shot over two mornings in Tirupur and one long afternoon in Bhilwara.
          No stylists, no steamers.
        </p>
      </header>

      <StickyStack images={stacked} total={all.length} />

      <div className="mt-2">
        <LookbookGrid
          images={gridded}
          total={all.length}
          offset={STACK_COUNT}
        />
      </div>

      <section className="px-6 pt-24 md:px-12">
        <p className="t-label text-accent-ink">Shop the drop</p>
        <h2 className="t-display-md mt-3">All three, cut from one block.</h2>

        <ul className="mt-12 grid grid-cols-1 gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.slug}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
