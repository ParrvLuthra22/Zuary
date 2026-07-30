import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { ChapterClose } from "@/components/drops/ChapterClose";
import {
  DropLocked,
  EarlyAccessBand,
} from "@/components/drops/ChapterGate";
import { ChapterLookbook } from "@/components/drops/ChapterLookbook";
import { ChapterManifesto } from "@/components/drops/ChapterManifesto";
import { ChapterMaterial } from "@/components/drops/ChapterMaterial";
import { ChapterProducts } from "@/components/drops/ChapterProducts";
import { ChapterTitle } from "@/components/drops/ChapterTitle";
import { DROPS, getDrop } from "@/lib/data/drops";
import { PRODUCTS } from "@/lib/data/products";
import { getUserFlags } from "@/lib/db/queries";
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

  /*
   * Early access, for an upcoming drop only.
   *
   * The flag is read from the database rather than from the session token: the
   * token is a 30-day snapshot, and someone granted access this morning should
   * not have to sign out and back in to use it. A failure reading it falls
   * closed — the gate stays up rather than opening the drop to everyone.
   */
  let earlyAccess = false;
  if (drop.status === "upcoming") {
    const session = await auth();
    if (session?.user?.id) {
      try {
        const flags = await getUserFlags(session.user.id);
        earlyAccess = Boolean(flags?.earlyAccess);
      } catch (error) {
        console.error("[drop] early access", error);
      }
    }
  }

  const gated = drop.status === "upcoming" && !earlyAccess;

  if (gated) {
    return (
      <>
        <JsonLd data={dropSchema(drop)} />
        <ChapterTitle drop={drop} />
        <DropLocked drop={drop} />
      </>
    );
  }

  return (
    <>
      <JsonLd data={dropSchema(drop)} />

      <ChapterTitle drop={drop} />
      {drop.status === "upcoming" ? <EarlyAccessBand /> : null}
      <ChapterManifesto />
      <ChapterProducts products={products} />
      {/* Chapter 4 now always renders: it opens on the twelve-colourway grid,
          which exists. The location plates inside it are still gated on
          hasLookbook. */}
      <ChapterLookbook
        images={drop.hasLookbook ? drop.lookbookImages : []}
      />
      <ChapterMaterial />
      <ChapterClose />
    </>
  );
}
