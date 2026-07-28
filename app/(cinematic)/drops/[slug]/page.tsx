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

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return DROPS.map((drop) => ({ slug: drop.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const drop = getDrop(slug);
  if (!drop) return { title: "Not found" };

  return {
    title: drop.title,
    description: drop.tagline,
    openGraph: {
      title: `${drop.title} — ZUARY`,
      description: drop.tagline,
      images: drop.lookbookImages.slice(0, 1).map((i) => i.src),
      type: "website",
    },
  };
}

export default async function DropPage({ params }: Params) {
  const { slug } = await params;
  const drop = getDrop(slug);
  if (!drop) notFound();

  const products = PRODUCTS.filter((p) => drop.products.includes(p.slug));

  return (
    <>
      <ChapterTitle drop={drop} />
      <ChapterManifesto />
      <ChapterProducts products={products} />
      <ChapterLookbook images={drop.lookbookImages} />
      <ChapterMaterial />
      <ChapterClose />
    </>
  );
}
