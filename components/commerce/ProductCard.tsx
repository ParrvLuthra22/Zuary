"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { SIZES, type Product, type Size } from "@/lib/data/products";
import { cn, formatINR, seriesLabel } from "@/lib/utils";
import { useCartStore } from "@/stores/cart";

type ProductCardProps = {
  product: Product;
  priority?: boolean;
  className?: string;
};

/** Matches the shop grid: 1 col, 2 from sm, 3 from lg. */
const SIZES_ATTR = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

export function ProductCard({
  product,
  priority,
  className,
}: ProductCardProps) {
  const add = useCartStore((s) => s.add);
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const [secondaryFailed, setSecondaryFailed] = useState(false);

  const primary = product.images[0];
  const secondary = product.images[1];

  function addSize(size: Size) {
    add(product.slug, size, 1);
    toast(`${product.name} · ${size} added.`);
  }

  return (
    <article data-cursor="cta" className={cn("group relative", className)}>
      <div
        className="relative aspect-[4/5] w-full overflow-hidden rounded-sm border border-line"
        style={{ backgroundColor: product.swatch }}
      >
        {/* Scaling this wrapper rather than the images keeps the size bar still. */}
        <div className="absolute inset-0 transition-transform duration-[400ms] ease-[--ease-out] group-hover:scale-[1.04]">
          {primary && !primaryFailed ? (
            <Image
              src={primary}
              alt={
                product.imageAlts?.[0] ??
                `${product.name}, ${product.colour} ${product.fit} trousers`
              }
              fill
              priority={priority}
              sizes={SIZES_ATTR}
              className={cn(
                "object-cover transition-opacity duration-[400ms] ease-[--ease-out]",
                secondary && !secondaryFailed && "group-hover:opacity-0",
              )}
              onError={() => setPrimaryFailed(true)}
            />
          ) : null}

          {secondary && !secondaryFailed ? (
            <Image
              src={secondary}
              alt=""
              aria-hidden
              fill
              sizes={SIZES_ATTR}
              className="object-cover opacity-0 transition-opacity duration-[400ms] ease-[--ease-out] group-hover:opacity-100"
              onError={() => setSecondaryFailed(true)}
            />
          ) : null}
        </div>

        {/* Vignette for frames shot on a lifted backdrop — see
            Product.liftedBackdrop. Transparent over the garment, settling to
            the page colour at the edges, so the card sits at the same
            brightness as its neighbours without touching the source file or
            dimming the trouser itself. */}
        {product.liftedBackdrop ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 0%, var(--bg) 100%)",
              opacity: 0.18,
            }}
          />
        ) : null}

        {/* Desktop only: the brief says mobile has no hover state.
            The outer strip holds its final position and only becomes
            clickable on hover; the inner row does the sliding. Animating the
            buttons themselves would leave the stretched link exposed for the
            length of the transition, so a quick click would navigate instead
            of adding to the cart. */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 hidden h-12 overflow-hidden",
            "pointer-events-none group-hover:pointer-events-auto md:block",
          )}
        >
          <div
            className={cn(
              "flex h-full translate-y-full",
              "border-t border-line bg-bg-deep/85 backdrop-blur-md",
              "transition-transform duration-[400ms] ease-[--ease-out]",
              "group-hover:translate-y-0",
            )}
          >
            {SIZES.map((size) => {
              const inStock = product.sizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  disabled={!inStock}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    addSize(size);
                  }}
                  aria-label={
                    inStock
                      ? `Add ${product.name} size ${size} to cart`
                      : `${product.name} size ${size} is sold out`
                  }
                  className={cn(
                    "t-label flex-1 py-3 transition-colors duration-[--dur-micro]",
                    inStock
                      ? "text-fg hover:bg-accent hover:text-carbon"
                      : "cursor-not-allowed text-fg-muted/40 line-through",
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Covers the whole card — image, name and price — so anywhere that is
          not the size bar navigates to the PDP. The bar sits at z-20 above it,
          so those clicks never reach the link. */}
      <Link
        href={`/products/${product.slug}`}
        className="absolute inset-0 z-10 rounded-sm"
        aria-label={`${product.name} — ${formatINR(product.price)}`}
      />

      <div className="mt-4">
        <p className="t-label text-fg-muted">{seriesLabel(product.series)}</p>

        <div className="mt-2 flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <h3 className="t-display-sm text-fg">{product.name}</h3>
            <span className="t-deva text-sm text-fg-muted">{product.deva}</span>
          </div>
          <span className="font-mono text-sm text-fg-muted">
            {formatINR(product.price)}
          </span>
        </div>

        <span
          aria-hidden
          className="mt-3 block h-px w-0 bg-accent transition-[width] duration-[400ms] ease-[--ease-out] group-hover:w-full"
        />
      </div>
    </article>
  );
}
