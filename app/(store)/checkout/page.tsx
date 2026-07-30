import type { Metadata } from "next";

import { auth } from "@/auth";
import { CheckoutForm } from "@/components/commerce/CheckoutForm";
import { CheckoutSignIn } from "@/components/commerce/CheckoutSignIn";
import { listAddresses } from "@/lib/db/queries";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Checkout",
  description: "Complete your ZUARY order.",
  path: "/checkout",
  noIndex: true,
});

export default async function CheckoutPage() {
  /*
   * Middleware keeps signed-out visitors off this route, so reaching it without
   * a session means one thing: it expired while the page was open, with a full
   * cart. That case is handled inline rather than by redirecting — see
   * CheckoutSignIn. The form stays on screen underneath, bag and all.
   */
  const session = await auth();
  const account = session?.user ? { email: session.user.email ?? null } : null;

  /*
   * Saved addresses, if any. A failure here degrades to the plain form rather
   * than blocking payment — someone whose address list will not load can still
   * type one in and buy.
   */
  let savedAddresses: Awaited<ReturnType<typeof listAddresses>> = [];
  if (session?.user?.id) {
    try {
      savedAddresses = await listAddresses(session.user.id);
    } catch (error) {
      console.error("[checkout] addresses", error);
    }
  }

  return (
    <div className="px-6 pt-8 pb-24 md:px-12">
      <header className="mb-12">
        <p className="t-label text-accent-ink">Last step</p>
        <h1 className="t-display-lg mt-4">Checkout</h1>
      </header>

      {account ? null : (
        <div className="mb-12">
          <CheckoutSignIn />
        </div>
      )}

      <CheckoutForm account={account} savedAddresses={savedAddresses} />
    </div>
  );
}
