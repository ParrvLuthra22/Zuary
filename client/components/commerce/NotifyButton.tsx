"use client";

import { ButtonZ } from "@/client/components/ui/button-z";
import type { Product } from "@/shared/constants/products";
import { useNotifyStore } from "@/client/stores/notify";

/**
 * The client edge of an otherwise static coming-soon page — just enough to
 * reach the notify store, so the surrounding layout stays a server component.
 */
export function NotifyButton({
  product,
  size = "lg",
  variant = "primary",
  className,
  children = "Notify me",
}: {
  product: Product;
  size?: "md" | "lg";
  variant?: "primary" | "outline";
  className?: string;
  children?: React.ReactNode;
}) {
  const open = useNotifyStore((s) => s.open);

  return (
    <ButtonZ
      size={size}
      variant={variant}
      className={className}
      onClick={() => open(product)}
    >
      {children}
    </ButtonZ>
  );
}
