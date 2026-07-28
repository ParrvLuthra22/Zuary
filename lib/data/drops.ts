import type { ProductSlug } from "./products";

export type DropStatus = "teased" | "live" | "archived";

export type LookbookSpan = "full" | "half" | "third";

export type LookbookImage = {
  src: string;
  /** Grid width on the drop page: full = 12 cols, half = 6, third = 4. */
  span: LookbookSpan;
  caption: string;
  /** The trouser this shot features, linked from the lookbook caption. */
  product?: ProductSlug;
};

export type Drop = {
  slug: string;
  title: string;
  tagline: string;
  accent: "hazard";
  status: DropStatus;
  season: string;
  releasedAt: string; // ISO date
  intro: string;
  products: ProductSlug[];
  lookbookImages: LookbookImage[];
};

export const DROPS: Drop[] = [
  {
    slug: "the-trouser-trio",
    title: "The Trouser Trio",
    tagline: "Three cuts. One philosophy.",
    accent: "hazard",
    status: "live",
    season: "Drop 01",
    releasedAt: "2026-07-01",
    intro:
      "Three trousers, one block, three ways of reading it. Tailored, straight, pleated. Same rise, same waistband, same mills we visited twice before cutting anything.",
    products: ["kohl", "dhool", "reeh"],
    lookbookImages: [
      { src: "/lookbook/the-trouser-trio/01.webp", span: "full", caption: "First light on the cutting floor.", product: "kohl" },
      { src: "/lookbook/the-trouser-trio/02.webp", span: "half", caption: "A single break, nothing more.", product: "kohl" },
      { src: "/lookbook/the-trouser-trio/03.webp", span: "half", caption: "Faced waistband, no elastic.", product: "dhool" },
      { src: "/lookbook/the-trouser-trio/04.webp", span: "third", caption: "Drill at 300 GSM, washed once.", product: "dhool" },
      { src: "/lookbook/the-trouser-trio/05.webp", span: "third", caption: "The pleat stays shut standing.", product: "reeh" },
      { src: "/lookbook/the-trouser-trio/06.webp", span: "third", caption: "Hem left long for the tailor.", product: "reeh" },
      { src: "/lookbook/the-trouser-trio/07.webp", span: "half", caption: "Cut wide enough for a boot.", product: "dhool" },
      { src: "/lookbook/the-trouser-trio/08.webp", span: "half", caption: "Sand, and the light going.", product: "reeh" },
      { src: "/lookbook/the-trouser-trio/09.webp", span: "half", caption: "Black that fades at the seam.", product: "kohl" },
      { src: "/lookbook/the-trouser-trio/10.webp", span: "half", caption: "Three cuts, one block.", product: "kohl" },
    ],
  },
];

export const getDrop = (slug: string) => DROPS.find((d) => d.slug === slug);

export const currentDrop = DROPS.find((d) => d.status === "live") ?? DROPS[0];
