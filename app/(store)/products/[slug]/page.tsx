import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AddToCart } from "@/components/commerce/AddToCart";
import { ProductImage } from "@/components/commerce/ProductImage";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PRODUCTS, getProduct } from "@/lib/data/products";
import { seriesLabel } from "@/lib/utils";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PRODUCTS.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Not found" };
  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  return (
    <article className="grid gap-12 px-6 pt-16 pb-24 md:px-12 lg:grid-cols-2 lg:gap-16">
      <div className="space-y-3">
        {product.images.map((src, i) => (
          <ProductImage
            key={src}
            src={src}
            alt={`${product.name} — view ${i + 1}`}
            swatch={product.swatch}
            priority={i === 0}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="aspect-[3/4] w-full rounded-sm border border-line"
          />
        ))}
      </div>

      <div className="lg:sticky lg:top-24 lg:h-fit">
        <p className="t-label text-accent">{seriesLabel(product.series)}</p>

        <h1 className="t-display-lg mt-4">{product.name}</h1>
        <p className="t-deva mt-2 text-xl text-fg-muted">
          {product.deva}
          <span className="ml-3 font-mono text-xs tracking-widest uppercase">
            {product.devaMeaning}
          </span>
        </p>

        <p className="mt-8 max-w-md text-fg-muted">{product.description}</p>

        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-6">
          <Spec label="Fit" value={product.fit} />
          <Spec label="Fabric" value={product.fabric} />
          <Spec label="Weight" value={product.weight} />
          <Spec label="Mill" value={product.mill} />
        </dl>

        <div className="mt-10">
          <AddToCart product={product} />
        </div>

        <Accordion type="single" collapsible className="mt-10">
          <AccordionItem value="fabric" className="border-line">
            <AccordionTrigger className="t-label">The fabric</AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-fg-muted">
              {product.fabricStory}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="care" className="border-line">
            <AccordionTrigger className="t-label">Care</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1 text-sm text-fg-muted">
                {product.care.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </article>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="t-label text-fg-muted">{label}</dt>
      <dd className="mt-1 font-mono text-sm text-fg capitalize">{value}</dd>
    </div>
  );
}
