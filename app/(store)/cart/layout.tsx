import type { Metadata } from "next";

import { pageMetadata } from "@/lib/site";

// The cart page itself is a client component, so its metadata lives here.
export const metadata: Metadata = pageMetadata({
  title: "Cart",
  description: "Your ZUARY bag.",
  path: "/cart",
  noIndex: true,
});

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
