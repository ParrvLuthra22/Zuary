"use client";

import Image from "next/image";
import { useRef } from "react";

import { cn } from "@/shared/utils";

type StackGalleryProps = {
  images: string[];
  alt: string;
  className?: string;
};

/**
 * Sticky cards that stack on top of one another as you scroll. Each panel pins
 * a few pixels below the one before it, so the edges fan out at the top.
 */
export function StackGallery({ images, alt, className }: StackGalleryProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {images.map((src, i) => (
        <div
          key={src}
          className="sticky mx-auto w-full max-w-5xl px-6"
          style={{ top: `${6 + i * 1.5}rem`, zIndex: i }}
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md border border-line bg-bg-raised md:aspect-[16/10]">
            <Image
              src={src}
              alt={`${alt} — ${i + 1}`}
              fill
              sizes="(max-width: 1024px) 100vw, 64rem"
              className="object-cover"
            />
          </div>
        </div>
      ))}
      {/* Tail so the last panel can settle before the next section arrives. */}
      <div className="h-[40vh]" />
    </div>
  );
}
