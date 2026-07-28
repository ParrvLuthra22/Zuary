import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RevealText } from "@/components/motion/RevealText";
import { Marquee } from "@/components/sections/Marquee";
import { ProductRail } from "@/components/sections/ProductRail";
import { StackGallery } from "@/components/sections/StackGallery";
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
  return { title: drop.title, description: drop.tagline };
}

export default async function DropPage({ params }: Params) {
  const { slug } = await params;
  const drop = getDrop(slug);
  if (!drop) notFound();

  const products = PRODUCTS.filter((p) => drop.products.includes(p.slug));

  return (
    <>
      <header className="flex h-svh flex-col items-center justify-center px-6 text-center">
        <p className="t-label text-accent">{drop.season}</p>
        <h1 className="t-display-xl mt-4">{drop.title}</h1>
        <p className="t-label mt-6 text-fg-muted">{drop.tagline}</p>
      </header>

      <section className="px-6 py-28 md:px-12">
        <RevealText as="h2" className="t-display-md max-w-3xl">
          {drop.intro}
        </RevealText>
      </section>

      <Marquee items={["Three cuts", "One block", "Fixed run", "Cut sharp"]} speed={24} />

      <ProductRail products={products} eyebrow={drop.season} title="The three" />

      <StackGallery images={drop.lookbook} alt={drop.title} />
    </>
  );
}
