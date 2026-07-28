"use client";

import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonZProps = React.ComponentProps<"button"> & {
  /** primary = hazard fill. outline = hairline on the page colour. */
  variant?: "primary" | "outline";
  size?: "md" | "lg";
  asChild?: boolean;
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-sm font-mono text-xs uppercase tracking-[0.18em] " +
  "transition-colors duration-[--dur-micro] ease-[--ease-out] disabled:pointer-events-none disabled:opacity-50";

const VARIANTS = {
  primary: "bg-accent text-carbon hover:bg-accent-soft",
  outline: "border border-line text-fg hover:border-accent hover:text-accent",
} as const;

const SIZES = {
  md: "h-12 px-8",
  lg: "h-14 px-10",
} as const;

/**
 * ZUARY's call-to-action button. Wraps the same styling that was being
 * hand-repeated across the cart, checkout, hero and footer.
 */
export function ButtonZ({
  className,
  variant = "primary",
  size = "md",
  asChild,
  ...props
}: ButtonZProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button-z"
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    />
  );
}
