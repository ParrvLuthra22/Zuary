import { ImageResponse } from "next/og";

import { PRODUCTS, getProduct } from "@/shared/constants/products";

export const runtime = "nodejs";
export const alt = "ZUARY product";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return PRODUCTS.map((product) => ({ slug: product.slug }));
}

export default async function ProductOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);

  const name = product?.name ?? "ZUARY";
  // Satori resolves glyphs by fetching a matching font at build time, and the
  // rupee sign is not in its default face. "INR" needs no extra font.
  const price = product ? `INR ${product.price.toLocaleString("en-IN")}` : "";
  const swatch = product?.swatch ?? "#1C1E20";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#121416",
        }}
      >
        {/* Colour block stands in for the shot until photography lands. */}
        <div style={{ width: 420, height: "100%", background: swatch }} />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 72px",
          }}
        >
          <div
            style={{
              fontSize: 26,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#FF6B35",
            }}
          >
            {product ? `Series 0${product.series}` : "ZUARY"}
          </div>

          <div
            style={{
              marginTop: 18,
              fontSize: 128,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              color: "#F4F5F3",
            }}
          >
            {name}
          </div>

          {product ? (
            // Satori needs one child node here, or an explicit display.
            <div style={{ marginTop: 26, fontSize: 46, color: "#9BA1A5" }}>
              {`${price}  /  ${product.fit}  /  ${product.weight}`}
            </div>
          ) : null}

          <div
            style={{
              marginTop: "auto",
              marginBottom: 56,
              display: "flex",
              alignItems: "center",
              fontSize: 40,
              fontWeight: 900,
              color: "#F4F5F3",
            }}
          >
            <span>ZU</span>
            <div
              style={{
                width: 25,
                height: 22,
                margin: "0 4px",
                background: "#FF6B35",
                clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
              }}
            />
            <span>RY</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
