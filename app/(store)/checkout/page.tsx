import type { Metadata } from "next";

import { CheckoutForm } from "@/components/commerce/CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <div className="px-6 pt-8 pb-24 md:px-12">
      <header className="mb-12">
        <p className="t-label text-accent">Last step</p>
        <h1 className="t-display-lg mt-4">Checkout</h1>
      </header>

      <CheckoutForm />
    </div>
  );
}
