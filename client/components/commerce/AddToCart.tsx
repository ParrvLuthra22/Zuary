"use client";

import { useState } from "react";
import { toast } from "sonner";

import { SizeSelector } from "@/client/components/commerce/SizeSelector";
import { Magnetic } from "@/client/components/motion/Magnetic";
import { Button } from "@/client/components/ui/button";
import type { Product, Size } from "@/shared/constants/products";
import { formatINR } from "@/shared/utils";
import { useCartStore } from "@/client/stores/cart";
import { useUIStore } from "@/client/stores/ui";

export function AddToCart({ product }: { product: Product }) {
  const [size, setSize] = useState<Size | null>(null);
  const [error, setError] = useState(false);
  const add = useCartStore((s) => s.add);
  const openCart = useUIStore((s) => s.openCart);

  function handleAdd() {
    if (!size) {
      setError(true);
      toast("Pick a size first.");
      return;
    }
    add(product.slug, size, 1);
    openCart();
    toast(`${product.name} · ${size} added.`);
  }

  return (
    <div className="space-y-6">
      <SizeSelector
        sizes={product.sizes}
        value={size}
        onChange={(next) => {
          setSize(next);
          setError(false);
        }}
      />

      {error && !size ? (
        <p className="t-label text-accent-ink">Select a size to continue.</p>
      ) : null}

      <Magnetic strength={6} className="block w-full">
        <Button
          onClick={handleAdd}
          className="h-14 w-full rounded-sm bg-accent font-mono text-xs tracking-[0.18em] text-carbon uppercase hover:bg-accent-soft"
        >
          Add — {formatINR(product.price)}
        </Button>
      </Magnetic>

      <p className="t-label text-fg-muted">
        Free shipping over ₹2,000 · {product.mill}
      </p>
    </div>
  );
}
