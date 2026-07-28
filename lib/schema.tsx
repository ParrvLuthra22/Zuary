import type { Drop } from "@/lib/data/drops";
import type { Product } from "@/lib/data/products";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";

/** Organization schema for the homepage. */
export function organizationSchema() {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: base,
    logo: `${base}/icon.svg`,
    description: SITE_DESCRIPTION,
    address: {
      "@type": "PostalAddress",
      addressCountry: "IN",
      addressRegion: "Tamil Nadu",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "hello@zuary.in",
      areaServed: "IN",
    },
  };
}

/**
 * Product schema for a PDP. Availability is only claimed as InStock when the
 * database actually said so — with no stock data it stays Preorder rather than
 * asserting something we cannot back up.
 */
export function productSchema(product: Product, stock: Record<string, number> | null) {
  const base = siteUrl();
  const anyInStock = stock
    ? Object.values(stock).some((n) => n > 0)
    : null;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((src) => `${base}${src}`),
    sku: `ZU-${product.slug.toUpperCase()}`,
    brand: { "@type": "Brand", name: SITE_NAME },
    material: product.fabric,
    color: product.colour,
    offers: {
      "@type": "Offer",
      url: `${base}/products/${product.slug}`,
      price: product.price,
      priceCurrency: "INR",
      availability:
        anyInStock === null
          ? "https://schema.org/PreOrder"
          : anyInStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
}

export function dropSchema(drop: Drop) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: drop.title,
    description: drop.tagline,
    url: `${base}/drops/${drop.slug}`,
  };
}

/** Renders a JSON-LD block. Content is ours, never user input. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
