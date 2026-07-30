import { WaitlistWelcome } from "@/emails/WaitlistWelcome";
import { getProduct } from "@/lib/data/products";
import { emailOrigin } from "@/emails/components/EmailLayout";

import { sendEmail } from "./send";

/**
 * Unsubscribe link for marketing mail.
 *
 * TODO(B06): back this with a signed token and a real /unsubscribe route. The
 * address is encoded rather than signed today, which is enough to identify the
 * row but NOT enough to authorise the removal — the route that consumes it must
 * verify a signature before deleting anything, or it becomes an endpoint for
 * unsubscribing other people.
 */
function unsubscribeUrl(email: string) {
  return `${emailOrigin()}/unsubscribe?email=${encodeURIComponent(email)}`;
}

export async function sendWaitlistWelcome({
  email,
  productSlug,
}: {
  email: string;
  productSlug?: string;
}) {
  const product = productSlug ? getProduct(productSlug) : undefined;

  return sendEmail({
    to: email,
    subject: "You're on the list",
    react: WaitlistWelcome({
      productName: product?.name ?? null,
      unsubscribeUrl: unsubscribeUrl(email),
    }),
  });
}
