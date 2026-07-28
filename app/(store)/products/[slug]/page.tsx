import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BuyBox } from "@/components/commerce/BuyBox";
import { ProductCard } from "@/components/commerce/ProductCard";
import { ProductGallery } from "@/components/commerce/ProductGallery";
import { TriangleA } from "@/components/layout/Wordmark";
import { getVariantStock } from "@/lib/db/queries";
import { JsonLd, productSchema } from "@/lib/schema";
import { pageMetadata } from "@/lib/site";
import { PRODUCTS, getProduct, type Product } from "@/lib/data/products";

type Params = { params: Promise<{ slug: string }> };

// The catalogue is finite and known at build time. Without this, an unknown
// slug renders the not-found boundary with a 200 in production — a soft 404
// that search engines will happily index.
export const dynamicParams = false;

export function generateStaticParams() {
  return PRODUCTS.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Not found" };

  const url = `/products/${product.slug}`;

  return pageMetadata({
    title: product.name,
    description: product.description,
    path: url,
    // This route ships its own opengraph-image; null lets Next fill in the
    // hashed URL it actually serves.
    ogImage: null,
  });
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  // Null when there is no database yet; the buy box treats that as "unknown"
  // rather than sold out, so the page still works without one.
  const stock = await getVariantStock(slug);

  const others = PRODUCTS.filter((p) => p.slug !== product.slug);

  return (
    <div className="pb-32 md:pb-0">
      <JsonLd data={productSchema(product, stock)} />

      <article className="md:flex md:items-start">
        <div className="md:w-[58%]">
          <ProductGallery product={product} />
        </div>

        <div className="md:sticky md:top-28 md:w-[42%] md:self-start">
          <BuyBox product={product} stock={stock} />
        </div>
      </article>

      <FabricBand product={product} />
      <CareCards product={product} />

      <section className="px-6 py-24 md:px-12">
        <p className="t-label text-accent-ink">The other two</p>
        <h2 className="t-display-md mt-3">Same block, different cut.</h2>

        <ul className="mt-12 grid grid-cols-1 gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((other) => (
            <li key={other.slug}>
              <ProductCard product={other} />
            </li>
          ))}
          <li>
            <Link
              href="/drops/the-trouser-trio"
              className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-4 rounded-sm border border-dashed border-line transition-colors duration-[--dur-micro] hover:border-accent"
            >
              <TriangleA className="text-3xl" />
              <span className="t-label text-fg-muted">
                ZUARY 04 · Q4 2026
              </span>
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}

function FabricBand({ product }: { product: Product }) {
  const specs = [
    { label: "Weight", value: product.weight },
    { label: "Mill", value: product.mill },
    { label: "Weave", value: product.weave },
    { label: "Shrinkage", value: product.shrinkage },
  ];

  return (
    <section className="grid gap-10 border-t border-line md:grid-cols-2 md:gap-0">
      <div
        className="relative aspect-[4/3] w-full overflow-hidden bg-bg-raised md:aspect-auto md:min-h-[36rem]"
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/material/mill.webp"
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      <div className="px-6 pb-16 md:px-12 md:py-24">
        <p className="t-label text-accent-ink">Fabric</p>
        <h2 className="t-display-sm mt-3">{product.fabric}.</h2>
        <p className="mt-6 max-w-prose text-sm leading-relaxed text-fg-muted">
          {product.fabricStory}
        </p>

        <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-line pt-8">
          {specs.map((spec) => (
            <div key={spec.label}>
              <dt className="t-label text-fg-muted">{spec.label}</dt>
              <dd className="mt-1 text-sm text-fg">{spec.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function CareCards({ product }: { product: Product }) {
  const icons = [<Droplet key="d" />, <Hanger key="h" />, <Iron key="i" />];

  return (
    <section className="border-t border-line px-6 py-24 md:px-12">
      <p className="t-label text-accent-ink">Care</p>
      <h2 className="t-display-sm mt-3">Keep it sharp.</h2>

      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {product.care.slice(0, 3).map((line, i) => (
          <li
            key={line}
            className="rounded-sm border border-line bg-bg-raised p-8"
          >
            <span className="block text-accent-ink">{icons[i]}</span>
            <p className="mt-6 text-sm text-fg">{line}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* Hand-drawn so they match the hairline weight of the rest of the page. */

function Droplet() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
      <path d="M12 3.5 6.8 11a6.2 6.2 0 1 0 10.4 0Z" strokeLinejoin="round" />
      <path d="M9.4 14.6a2.9 2.9 0 0 0 2.6 2.6" strokeLinecap="round" />
    </svg>
  );
}

function Hanger() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
      <path d="M12 8.2a2.1 2.1 0 1 1 2.1-2.1" strokeLinecap="round" />
      <path d="M12 8.2v2.1L3.4 16a1.2 1.2 0 0 0 .7 2.2h15.8a1.2 1.2 0 0 0 .7-2.2L12 10.3" strokeLinejoin="round" />
    </svg>
  );
}

function Iron() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
      <path d="M3 16.5v-2.2a5.6 5.6 0 0 1 5.6-5.6H15a6 6 0 0 1 6 6v1.8Z" strokeLinejoin="round" />
      <path d="M7.6 8.7V7.4a2 2 0 0 1 2-2h5.1" strokeLinecap="round" />
      <path d="M3 19.2h18" strokeLinecap="round" />
    </svg>
  );
}
