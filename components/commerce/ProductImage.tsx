import Image from "next/image";

import { BLUR } from "@/lib/data/blur";
import { cn } from "@/lib/utils";

type ProductImageProps = {
  src: string;
  alt: string;
  /** Key into BLUR, e.g. `reeh-01`. Without it the image fades in from nothing. */
  blurKey?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

/** Three across on desktop, two on tablet, full-bleed on phones. */
const DEFAULT_SIZES =
  "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw";

/**
 * A product frame with nothing around it.
 *
 * The photography is shot on a neutral near-black sweep that matches --bg
 * exactly, so on the dark theme the image has no edge: the sweep and the page
 * are one surface, and the trouser appears to float. A border, a radius or a
 * raised background would all put the rectangle back and break that.
 *
 * The light theme is the opposite problem — a near-black photo on paper is a
 * dark slab, and it needs a hairline to sit down properly. That is a CSS
 * variant, not a branch on theme state, so it stays correct through SSR and
 * through a theme toggle without a re-render.
 */
export function ProductImage({
  src,
  alt,
  blurKey,
  priority,
  sizes = DEFAULT_SIZES,
  className,
}: ProductImageProps) {
  const blurDataURL = blurKey ? BLUR[blurKey] : undefined;

  return (
    <div
      data-cursor="image"
      className={cn(
        "relative aspect-[4/5] w-full overflow-hidden bg-bg",
        "light:border light:border-line light:bg-bg-raised",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover"
        {...(blurDataURL
          ? ({ placeholder: "blur", blurDataURL } as const)
          : null)}
      />
    </div>
  );
}
