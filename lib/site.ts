/** Canonical origin. Falls back to localhost so builds work without env. */
export function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export const SITE_NAME = "ZUARY";
export const SITE_TAGLINE = "Cut sharp.";
export const SITE_DESCRIPTION =
  "Indian trousers cut in fixed runs. Three fits from one block, woven in Tamil Nadu and Rajasthan.";

import type { Metadata } from "next";

type PageMeta = {
  title: string;
  description: string;
  /** Path only, e.g. "/shop". Used for the canonical and og:url. */
  path: string;
  /** Skip the "%s — ZUARY" template. */
  absoluteTitle?: boolean;
  /**
   * Defaults to the site card. Pass null on a route that ships its own
   * opengraph-image file — Next appends a hash to that route's URL, so the
   * path cannot be written by hand and the images key must be left off for
   * the file convention to fill it in.
   */
  ogImage?: string | null;
  type?: "website" | "article";
  noIndex?: boolean;
};

/**
 * One place that builds title, description, canonical, Open Graph and Twitter.
 *
 * Declaring `openGraph` on a page suppresses the og:image inherited from an
 * ancestor's opengraph-image file, so the image is always set explicitly here —
 * otherwise the most-shared pages end up with no card at all.
 */
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle,
  ogImage = "/opengraph-image",
  type = "website",
  noIndex,
}: PageMeta): Metadata {
  const social = absoluteTitle ? title : `${title} — ${SITE_NAME}`;
  const images =
    ogImage === null
      ? {}
      : { images: [{ url: ogImage, width: 1200, height: 630, alt: social }] };

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: social,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "en_IN",
      type,
      ...images,
    },
    twitter: {
      card: "summary_large_image",
      title: social,
      description,
      ...(ogImage === null ? {} : { images: [ogImage] }),
    },
  };
}
