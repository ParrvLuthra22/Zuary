import { DropBridge } from "@/components/sections/DropBridge";
import { HeroScrub } from "@/components/sections/HeroScrub";
import { Marquee } from "@/components/sections/Marquee";
import { MaterialScroll } from "@/components/sections/MaterialScroll";
import { SpecsTable } from "@/components/sections/SpecsTable";
import { TrioRail } from "@/components/sections/TrioRail";
import { WaitlistSection } from "@/components/sections/WaitlistSection";
import { currentDrop } from "@/lib/data/drops";
import { PRODUCTS, getProduct } from "@/lib/data/products";

const kohl = getProduct("kohl");

export default function HomePage() {
  return (
    <>
      {/* 1 — /public/sequence/hero is empty, so the hero cross-dissolves the
          KOHL frames. Switch to mode="sequence" once the shoot lands. */}
      <HeroScrub mode="crossfade" fallbackImages={kohl?.images ?? []} />

      {/* 2 */}
      <Marquee
        variant="outline"
        speed={40}
        items={[
          "ENGINEERED FIT",
          "280 GSM",
          "MADE IN INDIA",
          "FREE SHIPPING OVER ₹2000",
          "CUT SHARP",
        ]}
      />

      {/* 3 */}
      <TrioRail products={PRODUCTS} />

      {/* 4 */}
      <MaterialScroll />

      {/* 5 */}
      <SpecsTable products={PRODUCTS} />

      {/* 6 */}
      <DropBridge drop={currentDrop} />

      {/* 7 */}
      <WaitlistSection />
    </>
  );
}
