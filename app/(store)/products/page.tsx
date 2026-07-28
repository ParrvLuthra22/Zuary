import type { Metadata } from "next";

import { ProductRail } from "@/components/sections/ProductRail";
import { PRODUCTS } from "@/lib/data/products";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Products",
  description: "Every trouser ZUARY has cut.",
  path: "/products",
});

export default function ProductsPage() {
  return (
    <div className="pt-16">
      <header className="px-6 md:px-12">
        <p className="t-label text-accent-ink">Everything</p>
        <h1 className="t-display-lg mt-4">Products</h1>
      </header>

      <ProductRail products={PRODUCTS} />
    </div>
  );
}
