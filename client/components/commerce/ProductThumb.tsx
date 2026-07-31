import { ProductImage } from "@/client/components/commerce/ProductImage";
import { blurKeyFor } from "@/shared/constants/blur";
import type { Product } from "@/shared/constants/products";
import { cn } from "@/shared/utils";

/**
 * The cart's small square-ish frame. Two of the three trousers have not been
 * shot yet, so this shows the garment's real colour rather than a photo of
 * something else — the line already names the product, so the swatch is
 * decoration and is hidden from screen readers.
 */
export function ProductThumb({
  product,
  sizes,
  className,
}: {
  product: Product;
  sizes: string;
  className?: string;
}) {
  const src = product.images[0];

  if (!src) {
    return (
      <div
        aria-hidden
        className={cn("shrink-0 rounded-sm border border-line", className)}
        style={{ backgroundColor: product.swatch }}
      />
    );
  }

  return (
    <ProductImage
      src={src}
      alt={product.name}
      blurKey={blurKeyFor(src)}
      sizes={sizes}
      className={cn("shrink-0 rounded-sm border border-line", className)}
    />
  );
}
