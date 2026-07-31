import type { Metadata } from "next";

import { DropBridge } from "@/client/components/sections/DropBridge";
import { HeroScrub } from "@/client/components/sections/HeroScrub";
import { Marquee } from "@/client/components/sections/Marquee";
import { MaterialScroll } from "@/client/components/sections/MaterialScroll";
import { RangeSection } from "@/client/components/sections/RangeSection";
import { SpecsTable } from "@/client/components/sections/SpecsTable";
import { TrioRail } from "@/client/components/sections/TrioRail";
import { WaitlistSection } from "@/client/components/sections/WaitlistSection";
import { currentDrop } from "@/shared/constants/drops";
import {
  PRODUCTS,
  availableProducts,
  comingSoonProducts,
} from "@/shared/constants/products";

import { getProductImages } from "@/server/db/queries/product-images";
import { JsonLd, organizationSchema } from "@/shared/utils/json-ld";
import { SITE_DESCRIPTION, pageMetadata } from "@/shared/constants/site";

/**
 * Full length → detail → full length. Cross-dissolving straight down 01…06
 * runs two wides then four macros and the back half stops reading as the same
 * garment; this order keeps returning to the silhouette.
 */
const HERO_ORDER = [0, 1, 5, 3, 4, 2];

export const metadata: Metadata = pageMetadata({
  title: "ZUARY — Cut sharp.",
  absoluteTitle: true,
  description: SITE_DESCRIPTION,
  path: "/",
});

export default async function HomePage() {
  /* Hero frames come from the database like everything else, so an image
     swapped in the admin changes the homepage too. */
  const gallery = await getProductImages("kohl");
  const heroFrames = HERO_ORDER.map((i) => gallery[i]?.url).filter(
    (url): url is string => Boolean(url),
  );

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
        fallbackImages={heroFrames}
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
