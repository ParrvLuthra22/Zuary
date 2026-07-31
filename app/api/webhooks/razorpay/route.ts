import { NextResponse } from "next/server";

import { route } from "@/server/http";
import { sendOrderConfirmation } from "@/server/services/email.service";
import { handleWebhook } from "@/server/services/orders.service";

export const runtime = "nodejs";

/**
 * The source of truth for payment state. /checkout/verify is only the fast path
 * for the shopper's own tab; if it never runs, this still settles.
 *
 * The raw text is read and handed over unparsed — the HMAC is over the exact
 * bytes received, and re-serialised JSON would never match.
 *
 * Errors become non-2xx via `route`, which is what asks Razorpay to retry. That
 * is the right answer for a transient fault and harmless for a repeat: the
 * settle is idempotent, so a retried webhook takes no stock and sends no second
 * email.
 */
export const POST = route("webhooks/razorpay", async (request: Request) => {
  const result = await handleWebhook({
    rawBody: await request.text(),
    signature: request.headers.get("x-razorpay-signature"),
  });

  if (result.handled === "paid" && result.shouldSendConfirmation) {
    await sendOrderConfirmation(result.orderId);
  }

  return NextResponse.json({ ok: true, ...result });
});
