import type { MetadataRoute } from "next";

import { siteUrl } from "@/shared/constants/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nothing here is useful in an index and some of it is per-visitor.
        disallow: ["/api/", "/checkout", "/cart", "/orders"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
