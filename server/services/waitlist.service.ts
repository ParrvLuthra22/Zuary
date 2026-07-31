import "server-only";

import { addToWaitlist } from "@/server/db/queries";
import { sendWaitlistWelcome } from "./email.service";

/**
 * Not one of the five services in the brief, but the waitlist route had the
 * same shape of logic sitting inside it — a write plus a mail plus the rule
 * about which one is allowed to fail — and leaving it in the handler would have
 * been the one exception to the pattern.
 */
export async function joinWaitlist(input: {
  email: string;
  source: string;
  productSlug?: string;
  size?: string;
}) {
  const email = input.email.toLowerCase().trim();

  await addToWaitlist(email, input.source, {
    productSlug: input.productSlug,
    size: input.size,
  });

  /*
   * The welcome mail comes after the row is safely written and cannot fail the
   * signup — sendWaitlistWelcome never throws. Someone on the list who did not
   * get the mail is a far better outcome than someone who is not on the list.
   */
  await sendWaitlistWelcome(email, { productSlug: input.productSlug });

  return { email };
}
