import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ProductCard } from "@/components/commerce/ProductCard";
import { TriangleA } from "@/components/layout/Wordmark";
import { getProduct } from "@/lib/data/products";
import { listWishlistSlugs } from "@/lib/db/queries";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Wishlist",
  description: "Trousers you have saved.",
  path: "/account/wishlist",
  noIndex: true,
});

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/account/wishlist");

  let slugs: string[] = [];
  try {
    slugs = await listWishlistSlugs(session.user.id);
  } catch (error) {
    console.error("[account/wishlist]", error);
    return (
      <div className="py-12">
        <p className="t-display-sm">Could not load your wishlist.</p>
        <p className="mt-4 max-w-sm text-sm text-fg-muted">
          Something is wrong on our side. Nothing has been removed.
        </p>
      </div>
    );
  }

  /*
   * A slug saved before a product was pulled from the catalogue has nothing to
   * render, so it is dropped here rather than crashing the grid. The row stays
   * in the database — if the product comes back, so does the saved item.
   */
  const products = slugs.flatMap((slug) => {
    const product = getProduct(slug);
    return product ? [product] : [];
  });

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-start gap-5 py-16">
        <TriangleA className="text-4xl" />
        <p className="t-display-sm">Nothing saved yet.</p>
        <p className="max-w-sm text-sm text-fg-muted">
          Tap the heart on any trouser and it lands here.
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 className="t-label text-fg-muted">
        {products.length} {products.length === 1 ? "item" : "items"}
      </h2>

      <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <li key={product.slug}>
            {/* saved is true by construction here — the heart doubles as the
                remove control, and unsaving revalidates this page. */}
            <ProductCard
              product={product}
              wishlist={{ signedIn: true, saved: true }}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
