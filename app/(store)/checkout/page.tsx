import type { Metadata } from "next";

import { CheckoutForm } from "@/components/commerce/CheckoutForm";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Checkout",
  description: "Complete your ZUARY order.",
  path: "/checkout",
  noIndex: true,
});

export default function CheckoutPage() {
  return (
    <div className="px-6 pt-8 pb-24 md:px-12">
      <header className="mb-12">
        <p className="t-label text-accent-ink">Last step</p>
        <h1 className="t-display-lg mt-4">Checkout</h1>
      </header>

      <CheckoutForm />
    </div>
  );
}
