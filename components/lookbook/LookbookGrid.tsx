"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { LookbookImage } from "@/lib/data/drops";
import { getProduct } from "@/lib/data/products";
import { dur, easeOut } from "@/lib/motion/easing";
import { cn } from "@/lib/utils";

/** Cycled so the grid never reads as a uniform block. */
const RATIOS = ["aspect-[4/5]", "aspect-square", "aspect-[3/4]"];

export function LookbookGrid({
  images,
  total,
  offset,
}: {
  images: LookbookImage[];
  total: number;
  offset: number;
}) {
  return (
    <ul className="grid grid-cols-2 gap-2 px-2 md:grid-cols-3">
      {images.map((image, i) => (
        <Plate
          key={image.src}
          image={image}
          ratio={RATIOS[i % RATIOS.length]}
          index={offset + i + 1}
          total={total}
        />
      ))}
    </ul>
  );
}

function Plate({
  image,
  ratio,
  index,
  total,
}: {
  image: LookbookImage;
  ratio: string;
  index: number;
  total: number;
}) {
  const [failed, setFailed] = useState(false);
  const product = image.product ? getProduct(image.product) : undefined;

  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: dur.mid, ease: [...easeOut] }}
      className={cn("group relative overflow-hidden bg-bg-raised", ratio)}
    >
      {!failed ? (
        <Image
          src={image.src}
          alt={image.caption}
          fill
          loading="lazy"
          sizes="(min-width: 768px) 33vw, 50vw"
          className="object-cover transition-transform duration-[--dur-mid] ease-[--ease-out] group-hover:scale-[1.03]"
          onError={() => setFailed(true)}
        />
      ) : null}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-carbon/85 to-transparent"
      />

      <figcaption className="absolute bottom-0 left-0 p-4">
        <p className="t-label text-accent">
          {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </p>
        <p className="mt-1.5 text-sm text-off-white">{image.caption}</p>
        {product ? (
          <Link
            href={`/products/${product.slug}`}
            className="t-label mt-2 inline-block text-off-white/70 hover:text-accent"
          >
            {product.name} →
          </Link>
        ) : null}
      </figcaption>
    </motion.li>
  );
}
