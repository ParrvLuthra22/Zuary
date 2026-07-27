import type { Metadata } from "next";

import { ProductRail } from "@/components/sections/ProductRail";
import { currentDrop } from "@/lib/data/drops";
import { PRODUCTS } from "@/lib/data/products";

export const metadata: Metadata = {
  title: "Shop",
  description: "Three cuts, one block. Trousers made in fixed runs.",
};

export default function ShopPage() {
  return (
    <div className="pt-16">
      <header className="px-6 md:px-12">
        <p className="t-label text-accent">{currentDrop.season}</p>
        <h1 className="t-display-lg mt-4">{currentDrop.title}</h1>
        <p className="mt-4 max-w-md text-fg-muted">{currentDrop.tagline}</p>
      </header>

      <ProductRail products={PRODUCTS} />
    </div>
  );
}
