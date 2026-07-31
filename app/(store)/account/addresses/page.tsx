import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth/config";
import { AddressList } from "@/client/components/account/AddressList";
import { listAddresses } from "@/server/db/queries";
import { pageMetadata } from "@/shared/constants/site";

export const metadata: Metadata = pageMetadata({
  title: "Addresses",
  description: "Your saved delivery addresses.",
  path: "/account/addresses",
  noIndex: true,
});

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/account/addresses");

  let addresses;
  try {
    addresses = await listAddresses(session.user.id);
  } catch (error) {
    console.error("[account/addresses]", error);
    return (
      <div className="py-12">
        <p className="t-display-sm">Could not load your addresses.</p>
        <p className="mt-4 max-w-sm text-sm text-fg-muted">
          Something is wrong on our side. Nothing has been lost — try again in a
          moment.
        </p>
      </div>
    );
  }

  return <AddressList addresses={addresses} />;
}
