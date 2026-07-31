import type { MetadataRoute } from "next";

import { DROPS } from "@/shared/constants/drops";
import { POLICIES } from "@/shared/constants/policies";
import { PRODUCTS } from "@/shared/constants/products";
import { siteUrl } from "@/shared/constants/site";

/** Cart, checkout and orders are deliberately absent — see robots.ts. */
const STATIC_ROUTES: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, freq: "weekly" },
  { path: "/shop", priority: 0.9, freq: "weekly" },
  { path: "/products", priority: 0.8, freq: "weekly" },
  { path: "/drops", priority: 0.8, freq: "weekly" },
  /* /lookbook is parked until there is lookbook photography — see
     app/(store)/lookbook/_parked-page.tsx. Restore this entry with the route. */
  { path: "/about", priority: 0.6, freq: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${base}${route.path}`,
      lastModified: now,
      changeFrequency: route.freq,
      priority: route.priority,
    })),
    ...PRODUCTS.map((product) => ({
      url: `${base}/products/${product.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...DROPS.map((drop) => ({
      url: `${base}/drops/${drop.slug}`,
      lastModified: new Date(drop.releasedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...POLICIES.map((policy) => ({
      url: `${base}/policies/${policy.slug}`,
      lastModified: new Date(policy.updatedAt),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
