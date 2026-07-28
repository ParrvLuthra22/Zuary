"use client";

import { MapPin, RotateCcw, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ButtonZ } from "@/components/ui/button-z";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SIZES, SIZE_GUIDE, type Product, type Size } from "@/lib/data/products";
import { flyToCart } from "@/lib/motion/fly-to-cart";
import { cn, formatINR, seriesLabel } from "@/lib/utils";
import { useCartStore } from "@/stores/cart";
import { useUIStore } from "@/stores/ui";

type BuyBoxProps = {
  product: Product;
  /** Per-size stock. Null when the database is unreachable — sizes are then
   *  treated as available rather than falsely shown as sold out. */
  stock: Record<string, number> | null;
};

export function BuyBox({ product, stock }: BuyBoxProps) {
  const [size, setSize] = useState<Size | null>(null);
  const add = useCartStore((s) => s.add);
  const openCart = useUIStore((s) => s.openCart);

  const inStock = (s: Size) => {
    if (!product.sizes.includes(s)) return false;
    if (!stock) return true;
    return (stock[s] ?? 0) > 0;
  };

  function addToBag() {
    if (!size || !inStock(size)) return;
    flyToCart(document.querySelector<HTMLElement>('[data-gallery-frame="0"]'));
    add(product.slug, size, 1);
    openCart();
    toast(`${product.name} · ${size} added to bag.`);
  }

  const sizePills = (
    <div className="flex gap-2">
      {SIZES.map((s) => {
        const available = inStock(s);
        return (
          <button
            key={s}
            type="button"
            disabled={!available}
            onClick={() => setSize(s)}
            aria-pressed={size === s}
            aria-label={available ? `Size ${s}` : `Size ${s}, sold out`}
            className={cn(
              "t-label h-11 flex-1 rounded-none border transition-colors duration-[--dur-micro]",
              !available &&
                "cursor-not-allowed border-line text-fg-muted/40 line-through",
              available && size === s && "border-accent bg-accent text-carbon",
              available &&
                size !== s &&
                "border-line text-fg hover:border-fg-muted",
            )}
          >
            {s}
          </button>
        );
      })}
    </div>
  );

  const addButton = (
    <ButtonZ
      onClick={addToBag}
      disabled={!size}
      className="h-14 w-full"
      aria-label={size ? `Add ${product.name} size ${size} to bag` : undefined}
    >
      {size ? "Add to bag" : "Select a size"}
    </ButtonZ>
  );

  return (
    <>
      <div className="px-6 py-10 md:px-12 md:py-0">
        <p className="t-label text-fg-muted">{seriesLabel(product.series)}</p>

        <h1 className="t-display-lg mt-3">{product.name}</h1>

        <p className="mt-2">
          <span className="t-deva text-xl text-accent">{product.deva}</span>
          <span className="ml-3 text-sm text-fg-muted">
            — {product.devaMeaning}
          </span>
        </p>

        <p className="t-display-sm mt-6">{formatINR(product.price)}</p>

        <hr className="my-8 border-line" />

        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="size-6 rounded-full ring-2 ring-accent ring-offset-2 ring-offset-bg"
            style={{ backgroundColor: product.swatch }}
          />
          <span className="t-label text-fg-muted">{product.colour}</span>
        </div>

        <div className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="t-label text-fg-muted">Size</span>
            <SizeGuideDialog />
          </div>
          {sizePills}
        </div>

        {/* The sticky bar carries the button on mobile. */}
        <div className="mt-6 hidden md:block">{addButton}</div>

        <ul className="mt-8 space-y-3">
          <Trust icon={<Truck className="size-4" />}>
            Free shipping over ₹2,000
          </Trust>
          <Trust icon={<RotateCcw className="size-4" />}>7-day returns</Trust>
          <Trust icon={<MapPin className="size-4" />}>Made in Tirupur</Trust>
        </ul>

        <Accordion type="single" collapsible className="mt-10">
          <AccordionItem value="fabric" className="border-line">
            <AccordionTrigger className="t-label">
              Fabric &amp; care
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm leading-relaxed text-fg-muted">
                {product.fabricStory}
              </p>
              <ul className="mt-4 space-y-1 text-sm text-fg-muted">
                {product.care.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="fit" className="border-line">
            <AccordionTrigger className="t-label">
              Fit &amp; sizing
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm leading-relaxed text-fg-muted">
                {product.description}
              </p>
              <p className="mt-4 text-sm text-fg-muted">
                Cut <span className="text-fg">{product.fit}</span> on the shared
                block. All three trousers size the same, so a {product.sizes[1]}{" "}
                here is a {product.sizes[1]} in the others.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="shipping" className="border-line">
            <AccordionTrigger className="t-label">
              Shipping &amp; returns
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1 text-sm text-fg-muted">
                <li>Dispatched within three working days of payment.</li>
                <li>Metro addresses: three to five working days after that.</li>
                <li>7 days to return, unworn and tagged.</li>
                <li>One free size exchange per order, subject to stock.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Mobile: size + add, held above the home indicator. */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 space-y-3 border-t border-line bg-bg/95 px-6 pt-3 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        {sizePills}
        {addButton}
      </div>
    </>
  );
}

function Trust({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 text-fg-muted">
      <span className="text-accent">{icon}</span>
      <span className="t-label">{children}</span>
    </li>
  );
}

function SizeGuideDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="t-label text-accent hover:underline">
          Size guide
        </button>
      </DialogTrigger>
      <DialogContent className="border-line bg-bg">
        <DialogHeader>
          <DialogTitle className="t-display-sm">Size guide</DialogTitle>
          <DialogDescription className="t-label text-fg-muted">
            Garment measured flat, in inches
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left font-mono text-sm">
            <thead>
              <tr className="border-b border-line">
                {["Size", "Waist", "Inseam", "Thigh", "Hem"].map((h) => (
                  <th key={h} className="t-label py-3 text-fg-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-fg-muted">
              {SIZE_GUIDE.map((row) => (
                <tr key={row.size} className="border-b border-line">
                  <td className="py-3 text-fg">{row.size}</td>
                  <td className="py-3">{row.waist}</td>
                  <td className="py-3">{row.inseam}</td>
                  <td className="py-3">{row.thigh}</td>
                  <td className="py-3">{row.hem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
