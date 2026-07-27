"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Size } from "@/lib/data/products";
import { cn } from "@/lib/utils";

type SizeSelectorProps = {
  sizes: Size[];
  value: Size | null;
  onChange: (size: Size) => void;
  /** Sizes that are out of stock, rendered struck through and unselectable. */
  soldOut?: Size[];
  className?: string;
};

export function SizeSelector({
  sizes,
  value,
  onChange,
  soldOut = [],
  className,
}: SizeSelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between">
        <span className="t-label text-fg-muted">Size</span>
        <a href="/about#sizing" className="t-label text-accent hover:underline">
          Size guide
        </a>
      </div>

      <RadioGroup
        value={value ?? ""}
        onValueChange={(next) => onChange(next as Size)}
        className="flex flex-wrap gap-2"
      >
        {sizes.map((size) => {
          const disabled = soldOut.includes(size);
          return (
            <div key={size}>
              <RadioGroupItem
                id={`size-${size}`}
                value={size}
                disabled={disabled}
                className="peer sr-only"
              />
              <Label
                htmlFor={`size-${size}`}
                className={cn(
                  "flex h-11 min-w-14 cursor-pointer items-center justify-center rounded-sm border border-line px-4",
                  "font-mono text-sm transition-colors duration-[--dur-micro]",
                  "hover:border-fg-muted",
                  "peer-data-[state=checked]:border-accent peer-data-[state=checked]:text-accent",
                  disabled &&
                    "pointer-events-none text-fg-muted/40 line-through opacity-50",
                )}
              >
                {size}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
