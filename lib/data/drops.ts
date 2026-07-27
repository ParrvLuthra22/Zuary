import type { ProductSlug } from "./products";

export type DropStatus = "teased" | "live" | "archived";

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
  lookbook: string[];
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
    lookbook: [
      "/lookbook/the-trouser-trio/01.webp",
      "/lookbook/the-trouser-trio/02.webp",
      "/lookbook/the-trouser-trio/03.webp",
      "/lookbook/the-trouser-trio/04.webp",
      "/lookbook/the-trouser-trio/05.webp",
      "/lookbook/the-trouser-trio/06.webp",
      "/lookbook/the-trouser-trio/07.webp",
      "/lookbook/the-trouser-trio/08.webp",
    ],
  },
];

export const getDrop = (slug: string) => DROPS.find((d) => d.slug === slug);

export const currentDrop = DROPS.find((d) => d.status === "live") ?? DROPS[0];
