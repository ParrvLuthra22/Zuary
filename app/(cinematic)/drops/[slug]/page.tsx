import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChapterClose } from "@/components/drops/ChapterClose";
import { ChapterLookbook } from "@/components/drops/ChapterLookbook";
import { ChapterManifesto } from "@/components/drops/ChapterManifesto";
import { ChapterMaterial } from "@/components/drops/ChapterMaterial";
import { ChapterProducts } from "@/components/drops/ChapterProducts";
import { ChapterTitle } from "@/components/drops/ChapterTitle";
import { DROPS, getDrop } from "@/lib/data/drops";
import { PRODUCTS } from "@/lib/data/products";
import { JsonLd, dropSchema } from "@/lib/schema";
import { pageMetadata } from "@/lib/site";

type Params = { params: Promise<{ slug: string }> };

// The catalogue is finite and known at build time. Without this, an unknown
// slug renders the not-found boundary with a 200 in production — a soft 404
// that search engines will happily index.
export const dynamicParams = false;

export function generateStaticParams() {
  return DROPS.map((drop) => ({ slug: drop.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const drop = getDrop(slug);
  if (!drop) return { title: "Not found" };

  return pageMetadata({
    title: drop.title,
    description: `${drop.intro.slice(0, 150)}…`,
    path: `/drops/${drop.slug}`,
    type: "article",
  });
}

export default async function DropPage({ params }: Params) {
  const { slug } = await params;
  const drop = getDrop(slug);
  if (!drop) notFound();

  const products = PRODUCTS.filter((p) => drop.products.includes(p.slug));

  return (
    <>
      <JsonLd data={dropSchema(drop)} />

      <ChapterTitle drop={drop} />
      <ChapterManifesto />
      <ChapterProducts products={products} />
      <ChapterLookbook images={drop.lookbookImages} />
      <ChapterMaterial />
      <ChapterClose />
    </>
  );
}
