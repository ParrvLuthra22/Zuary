"use client";

import { TriangleA } from "@/components/layout/Wordmark";
import type { Product } from "@/lib/data/products";
import { cn } from "@/lib/utils";
import { useNotifyStore } from "@/stores/notify";

/**
 * The slot a trouser will occupy once it has been shot. Deliberately not a
 * photograph and deliberately not a grey box — a dashed frame reads as
 * "reserved", which is the honest state.
 *
 * Outer dimensions match ProductCard exactly so a mixed grid stays on the
 * same baseline, and the whole card opens the notify drawer rather than
 * linking to a PDP with no gallery.
 */
export function ComingSoonCard({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const open = useNotifyStore((s) => s.open);

  return (
    <article data-cursor="cta" className={cn("group relative", className)}>
      <div
        className={cn(
          "relative flex aspect-[4/5] w-full flex-col items-center justify-center gap-6",
          "overflow-hidden rounded-sm border border-dashed border-line bg-bg-raised",
          "transition-colors duration-[320ms] ease-[--ease-out]",
          "group-hover:border-solid group-hover:border-accent",
        )}
      >
        <span
          style={{ fontSize: "48px" }}
          className="opacity-40 transition-opacity duration-[320ms] ease-[--ease-out] group-hover:opacity-70"
        >
          <TriangleA />
        </span>

        <p className="t-display-sm text-fg opacity-30">{product.name}</p>
      </div>

      {/* Stretched over the whole card, exactly like ProductCard's link, so
          the name and label are part of the target too. */}
      <button
        type="button"
        onClick={() => open(product)}
        aria-label={`${product.name} is coming soon — get notified`}
        className="absolute inset-0 z-10 rounded-sm"
      />

      <div className="mt-4">
        <p className="t-label text-fg-muted">
          ZUARY {String(product.series).padStart(2, "0")}
        </p>

        <div className="mt-2 flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <h3 className="t-display-sm text-fg">{product.name}</h3>
            <span className="t-deva text-sm text-fg-muted">{product.deva}</span>
          </div>
          <span className="t-label text-accent-ink">Coming soon</span>
        </div>

        <span
          aria-hidden
          className="mt-3 block h-px w-0 bg-accent transition-[width] duration-[400ms] ease-[--ease-out] group-hover:w-full"
        />
      </div>
    </article>
  );
}
