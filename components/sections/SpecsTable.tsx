"use client";

import { motion } from "framer-motion";

import { dur, easeOut } from "@/lib/motion/easing";
import { inView } from "@/lib/motion/variants";
import type { Product } from "@/lib/data/products";

const ROWS: { label: string; value: (p: Product) => string }[] = [
  { label: "Cut", value: (p) => p.fit },
  { label: "Weight", value: (p) => p.weight },
  { label: "Fabric", value: (p) => p.fabric },
  { label: "Mill", value: (p) => p.mill },
];

/**
 * Dry, technical, deliberately unstyled-looking. Values are read from the
 * catalogue rather than typed in, so this block can never drift from what the
 * product pages say.
 */
export function SpecsTable({ products }: { products: Product[] }) {
  return (
    <section className="bg-bg-deep px-6 py-24 md:px-12">
      <h2 className="t-display-sm">Specification</h2>

      <div className="mt-12" role="table" aria-label="Trouser specification">
        <div
          role="row"
          className="grid grid-cols-2 gap-x-6 gap-y-2 border-b border-line pb-4 md:grid-cols-4"
        >
          <span role="columnheader" className="t-label text-fg-muted">
            Series
          </span>
          {products.map((product) => (
            <span
              key={product.slug}
              role="columnheader"
              className="t-label text-accent"
            >
              {product.name}
            </span>
          ))}
        </div>

        {ROWS.map((row, i) => (
          <motion.div
            key={row.label}
            role="row"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={inView}
            transition={{ duration: dur.mid, ease: [...easeOut], delay: i * 0.08 }}
            className="grid grid-cols-2 gap-x-6 gap-y-2 border-b border-line py-5 md:grid-cols-4"
          >
            <span role="rowheader" className="t-label text-fg-muted">
              {row.label}
            </span>
            {products.map((product) => (
              <span
                key={product.slug}
                role="cell"
                className="text-sm text-fg capitalize"
              >
                {row.value(product)}
              </span>
            ))}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
