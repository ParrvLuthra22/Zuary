"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

type ProductImageProps = {
  src: string;
  alt: string;
  /** Shown in place of the photo when the file is not there yet. */
  swatch: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

/**
 * next/image renders a broken-image glyph when a file is missing. Until the
 * shoot lands, fall back to the product's swatch instead.
 */
export function ProductImage({
  src,
  alt,
  swatch,
  sizes,
  priority,
  className,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ backgroundColor: swatch }}
    >
      {!failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="sr-only">{alt}</span>
      )}
    </div>
  );
}
