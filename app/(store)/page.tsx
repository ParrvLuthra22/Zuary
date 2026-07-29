import type { Metadata } from "next";

import { DropBridge } from "@/components/sections/DropBridge";
import { HeroScrub } from "@/components/sections/HeroScrub";
import { Marquee } from "@/components/sections/Marquee";
import { MaterialScroll } from "@/components/sections/MaterialScroll";
import { SpecsTable } from "@/components/sections/SpecsTable";
import { TrioRail } from "@/components/sections/TrioRail";
import { WaitlistSection } from "@/components/sections/WaitlistSection";
import { currentDrop } from "@/lib/data/drops";
import { PRODUCTS, getProduct } from "@/lib/data/products";

import { JsonLd, organizationSchema } from "@/lib/schema";
import { SITE_DESCRIPTION, pageMetadata } from "@/lib/site";

const kohl = getProduct("kohl");

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

      {/* 1 — /public/sequence/hero is empty, so the hero cross-dissolves the
          KOHL frames. Switch to mode="sequence" once the shoot lands.

          KOHL has not been shot, so right now this renders with no imagery at
          all. REEH is the only set we have, but the hero's spec lines, outro
          name, price and CTA are all KOHL — pointing the images at REEH
          without moving that copy would show sand cotton-linen under "280 GSM
          COTTON TWILL". Move both together or neither. */}
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
