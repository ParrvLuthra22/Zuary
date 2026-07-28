import type { ProductSlug } from "./products";

export type DropStatus = "teased" | "live" | "archived";

export type LookbookSpan = "full" | "half" | "third";

export type LookbookImage = {
  src: string;
  /** Grid width: full = 12 cols, half = 6, third = 4. */
  span: LookbookSpan;
  caption: string;
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
      { src: "/lookbook/the-trouser-trio/01.webp", span: "full", caption: "Tirupur, 06:40" },
      { src: "/lookbook/the-trouser-trio/02.webp", span: "half", caption: "KOHL, single break" },
      { src: "/lookbook/the-trouser-trio/03.webp", span: "half", caption: "Faced waistband" },
      { src: "/lookbook/the-trouser-trio/04.webp", span: "third", caption: "Drill, 300 GSM" },
      { src: "/lookbook/the-trouser-trio/05.webp", span: "third", caption: "Forward pleat" },
      { src: "/lookbook/the-trouser-trio/06.webp", span: "third", caption: "Hem, unfinished" },
      { src: "/lookbook/the-trouser-trio/07.webp", span: "half", caption: "DHOOL over boot" },
      { src: "/lookbook/the-trouser-trio/08.webp", span: "half", caption: "REEH, sand" },
    ],
  },
];

export const getDrop = (slug: string) => DROPS.find((d) => d.slug === slug);

export const currentDrop = DROPS.find((d) => d.status === "live") ?? DROPS[0];
