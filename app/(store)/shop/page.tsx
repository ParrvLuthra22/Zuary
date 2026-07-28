import type { Metadata } from "next";
import { Suspense } from "react";

import { NewsletterForm } from "@/components/commerce/NewsletterForm";
import { ShopBrowser } from "@/components/commerce/ShopBrowser";
import { RevealText } from "@/components/motion/RevealText";
import { Marquee } from "@/components/sections/Marquee";
import { PRODUCTS } from "@/lib/data/products";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Shop",
  description: "Three cuts, one block. Trousers made in fixed runs, India-wide.",
  path: "/shop",
});

export default function ShopPage() {
  return (
    <div className="pb-24">
      <header className="px-6 pt-8 pb-12 md:px-12">
        <p className="t-label text-accent">Shop</p>
        <RevealText as="h1" className="t-display-lg mt-4">
          All trousers.
        </RevealText>
        <p className="mt-5 max-w-md text-lg text-fg-muted">
          Three cuts. More landing soon.
        </p>
      </header>

      {/* ShopBrowser reads search params, so it needs a boundary to keep the
          rest of the page static. */}
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <ShopBrowser products={PRODUCTS} />
      </Suspense>

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

      <section className="flex flex-col items-center px-6 py-24 text-center">
        <p className="t-label text-accent">Next run</p>
        <h2 className="t-display-md mt-4">More cuts landing Q4.</h2>
        <p className="mt-4 max-w-md text-fg-muted">
          One block, more fabrics. Get told before the run opens.
        </p>
        <NewsletterForm source="shop" className="mt-8" />
      </section>
    </div>
  );
}
