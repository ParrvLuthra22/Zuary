import type { Metadata } from "next";
import Image from "next/image";

import { RevealText } from "@/components/motion/RevealText";
import { Marquee } from "@/components/sections/Marquee";
import { MaskedScrollSection } from "@/components/sections/MaskedScrollSection";
import { ProductRail } from "@/components/sections/ProductRail";
import { currentDrop } from "@/lib/data/drops";
import { PRODUCTS } from "@/lib/data/products";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Drops",
  description: `${currentDrop.title}. ${currentDrop.tagline}`,
  path: "/drops",
});

export default function DropsPage() {
  const products = PRODUCTS.filter((p) => currentDrop.products.includes(p.slug));

  return (
    <>
      {/* HeroScrub carries the homepage's own choreography, so the drop page
          keeps a plain full-viewport opener of its own. */}
      <header className="flex h-svh flex-col items-center justify-center px-6 text-center">
        <p className="t-label text-accent-ink">{currentDrop.season}</p>
        <h1 className="t-display-xl mt-4">{currentDrop.title}</h1>
        <p className="t-label mt-6 text-fg-muted">{currentDrop.tagline}</p>
      </header>

      <section className="px-6 py-28 md:px-12">
        <RevealText as="h2" className="t-display-md max-w-3xl">
          {currentDrop.intro}
        </RevealText>
      </section>

      <MaskedScrollSection
        media={
          <div
            className="relative h-full w-full"
            style={{ backgroundColor: "#2A2E31" }}
          >
            <Image
              // The lookbook has not been shot, so the masked reveal borrows
              // the one full-length frame that exists.
              src={
                currentDrop.hasLookbook
                  ? currentDrop.lookbookImages[0].src
                  : "/products/reeh/01.webp"
              }
              alt={currentDrop.title}
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
        }
      >
        <p className="t-label text-off-white">Shot on location — Tirupur</p>
      </MaskedScrollSection>

      <Marquee
        items={["Three cuts", "One block", "Fixed run", "Cut sharp"]}
        speed={24}
      />

      <ProductRail
        products={products}
        eyebrow={currentDrop.season}
        title="The three"
      />
    </>
  );
}
