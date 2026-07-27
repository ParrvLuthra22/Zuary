import { HeroScrub } from "@/components/sections/HeroScrub";
import { currentDrop } from "@/lib/data/drops";
import { getProduct } from "@/lib/data/products";

const kohl = getProduct("kohl");

export default function HomePage() {
  return (
    <>
      {/* /public/sequence/hero is empty, so the hero cross-dissolves the KOHL
          frames instead. Switch to mode="sequence" once the shoot lands. */}
      <HeroScrub mode="crossfade" fallbackImages={kohl?.images ?? []} />

      <section className="border-t border-line px-6 py-28 md:px-12">
        <p className="t-label text-accent">{currentDrop.season}</p>
        <h2 className="t-display-md mt-4 max-w-3xl">{currentDrop.tagline}</h2>
        <p className="mt-6 max-w-md text-fg-muted">
          The rest of the homepage lands next: product rail, fabric story,
          lookbook cut-in, and the drop marquee.
        </p>
      </section>
    </>
  );
}
