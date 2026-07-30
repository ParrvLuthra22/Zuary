import type { Metadata } from "next";
import ReactDOM from "react-dom";
import { Suspense } from "react";

import { auth } from "@/auth";

import { NewsletterForm } from "@/components/commerce/NewsletterForm";
import { ShopBrowser } from "@/components/commerce/ShopBrowser";
import { RevealText } from "@/components/motion/RevealText";
import { Marquee } from "@/components/sections/Marquee";
import { PRODUCTS, availableProducts } from "@/lib/data/products";
import { listWishlistSlugs } from "@/lib/db/queries";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Shop",
  description: "Three cuts, one block. Trousers made in fixed runs, India-wide.",
  path: "/shop",
});

/* Kept in step with ProductCard's own sizes attribute. */
const CARD_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";
/* next.config sets no custom deviceSizes, so these are Next's defaults. */
const DEVICE_WIDTHS = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];

const optimized = (src: string, width: number) =>
  `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;

export default async function ShopPage() {
  /*
   * ShopBrowser reads search params, so Next renders the whole grid on the
   * client and the Suspense fallback is all that reaches the HTML. That means
   * ProductCard's `priority` never emits its preload, and the browser does not
   * discover the first card's image until hydration — measured as 4.2s of LCP
   * load delay on mobile, which is most of the metric.
   *
   * This page IS server-rendered, so the preload goes here instead. Same URL
   * and srcset the client will ask for, so it is a cache hit rather than a
   * second download.
   */
  /* Wishlist state for the hearts. A failure here must not take the shop down —
     the grid renders without hearts rather than not at all. */
  const session = await auth();
  let savedSlugs: string[] = [];
  if (session?.user?.id) {
    try {
      savedSlugs = await listWishlistSlugs(session.user.id);
    } catch (error) {
      console.error("[shop] wishlist", error);
    }
  }

  const lcp = availableProducts()[0]?.images[0];
  if (lcp) {
    ReactDOM.preload(optimized(lcp, 1080), {
      as: "image",
      fetchPriority: "high",
      imageSrcSet: DEVICE_WIDTHS.map(
        (w) => `${optimized(lcp, w)} ${w}w`,
      ).join(", "),
      imageSizes: CARD_SIZES,
    });
  }

  return (
    <div className="pb-24">
      <header className="px-6 pt-8 pb-12 md:px-12">
        <p className="t-label text-accent-ink">Shop</p>
        <RevealText as="h1" className="t-display-lg mt-4">
          All trousers.
        </RevealText>
        <p className="mt-5 max-w-md text-lg text-fg-muted">
          Three cuts. More landing soon.
        </p>
      </header>

      {/* ShopBrowser reads search params, so it needs a boundary to keep the
          rest of the page static. */}
      <h2 className="sr-only">Trousers</h2>

      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <ShopBrowser
          products={PRODUCTS}
          wishlist={{ signedIn: Boolean(session?.user), savedSlugs }}
        />
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
        <p className="t-label text-accent-ink">Next run</p>
        <h2 className="t-display-md mt-4">More cuts landing Q4.</h2>
        <p className="mt-4 max-w-md text-fg-muted">
          One block, more fabrics. Get told before the run opens.
        </p>
        <NewsletterForm source="shop" className="mt-8" />
      </section>
    </div>
  );
}
