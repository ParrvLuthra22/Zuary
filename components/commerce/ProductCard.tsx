"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { Product } from "@/lib/data/products";
import { dur, easeOut } from "@/lib/motion/easing";
import { cn, formatINR, seriesLabel } from "@/lib/utils";

type ProductCardProps = {
  product: Product;
  priority?: boolean;
  className?: string;
};

export function ProductCard({ product, priority, className }: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const [failed, setFailed] = useState(false);

  // Second frame on hover, if the shoot has one.
  const src = hovered && product.images[1] ? product.images[1] : product.images[0];

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn("group block", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="relative aspect-[3/4] w-full overflow-hidden rounded-sm border border-line"
        style={{ backgroundColor: product.swatch }}
      >
        {!failed ? (
          <motion.div
            className="absolute inset-0"
            animate={{ scale: hovered ? 1.03 : 1 }}
            transition={{ duration: dur.mid, ease: [...easeOut] }}
          >
            <Image
              src={src}
              alt={product.name}
              fill
              priority={priority}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover"
              onError={() => setFailed(true)}
            />
          </motion.div>
        ) : null}

        <span className="t-label absolute top-3 left-3 text-off-white/70 mix-blend-difference">
          {seriesLabel(product.series)}
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <h3 className="t-display-sm text-fg">{product.name}</h3>
          <span className="t-deva text-sm text-fg-muted">{product.deva}</span>
        </div>
        <span className="font-mono text-sm text-fg-muted">
          {formatINR(product.price)}
        </span>
      </div>

      <p className="t-label mt-1 text-fg-muted">
        {product.fit} — {product.weight}
      </p>
    </Link>
  );
}
