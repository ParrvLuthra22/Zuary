"use client";

import { motion } from "framer-motion";

import { ProductCard } from "@/components/commerce/ProductCard";
import type { Product } from "@/lib/data/products";
import { fadeUp, inView, staggerParent } from "@/lib/motion/variants";
import { cn } from "@/lib/utils";

type ProductRailProps = {
  products: Product[];
  eyebrow?: string;
  title?: string;
  className?: string;
};

/** Horizontal snap rail on small screens, plain grid from md up. */
export function ProductRail({
  products,
  eyebrow,
  title,
  className,
}: ProductRailProps) {
  return (
    <section className={cn("py-20 md:py-28", className)}>
      {(eyebrow || title) && (
        <header className="mb-10 px-6 md:px-12">
          {eyebrow ? <p className="t-label text-accent">{eyebrow}</p> : null}
          {title ? <h2 className="t-display-md mt-3 text-fg">{title}</h2> : null}
        </header>
      )}

      <motion.ul
        variants={staggerParent}
        initial="hidden"
        whileInView="visible"
        viewport={inView}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-12"
      >
        {products.map((product, i) => (
          <motion.li
            key={product.slug}
            variants={fadeUp}
            className="w-[78vw] shrink-0 snap-start md:w-auto"
          >
            <ProductCard product={product} priority={i === 0} />
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}
