import type { Metadata } from "next";

import { DropBridge } from "@/components/sections/DropBridge";
import { HeroScrub } from "@/components/sections/HeroScrub";
import { Marquee } from "@/components/sections/Marquee";
import { MaterialScroll } from "@/components/sections/MaterialScroll";
import { RangeSection } from "@/components/sections/RangeSection";
import { SpecsTable } from "@/components/sections/SpecsTable";
import { TrioRail } from "@/components/sections/TrioRail";
import { WaitlistSection } from "@/components/sections/WaitlistSection";
import { currentDrop } from "@/lib/data/drops";
import {
  PRODUCTS,
  availableProducts,
  comingSoonProducts,
  getProduct,
} from "@/lib/data/products";

import { JsonLd, organizationSchema } from "@/lib/schema";
import { SITE_DESCRIPTION, pageMetadata } from "@/lib/site";

const hero = getProduct("kohl");

/**
 * Full length → detail → full length. Cross-dissolving straight down 01…06
 * runs two wides then four macros and the back half stops reading as the same
 * garment; this order keeps returning to the silhouette.
 */
const HERO_FRAMES = [0, 1, 5, 3, 4, 2]
  .map((i) => hero?.images[i])
  .filter((src): src is string => Boolean(src));

export const metadata: Metadata = pageMetadata({
  title: "ZUARY — Cut sharp.",
  absoluteTitle: true,
  description: SITE_DESCRIPTION,
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationSchema()} />

      {/* 1 — /public/sequence/hero is empty, so there is no rotation to scrub.
          The hero cross-dissolves the KOHL frames instead; switch to
          mode="sequence" once a turntable is shot. productSlug drives the spec
          rail, outro name, price and CTA, so the copy moves with the imagery
          rather than describing a different trouser. */}
      <HeroScrub
        mode="crossfade"
        fallbackImages={HERO_FRAMES}
        productSlug="kohl"
      />

      {/* 2 — back to 280 GSM with the hero: these are KOHL's numbers. */}
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

      {/* 3 — all three are shot, so this is three real panels in series order.
          The available-first ordering is kept so a future unshot product falls
          to the end rather than opening the rail on a placeholder. */}
      <TrioRail products={[...availableProducts(), ...comingSoonProducts()]} />

      {/* 4 */}
      <MaterialScroll />

      {/* 4b — the twelve-colourway grid. Deliberately sits here, between the
          material section and the drop bridge: it is the one stretch of this
          page with no buy control in it, and nine of the twelve colours in
          that shot are not for sale. */}
      <RangeSection />

      {/* 5 */}
      <SpecsTable products={PRODUCTS} />

      {/* 6 */}
      <DropBridge drop={currentDrop} />

      {/* 7 */}
      <WaitlistSection />
    </>
  );
}
