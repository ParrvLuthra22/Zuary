import { NextResponse } from "next/server";

import { requireUser } from "@/server/auth/guards";
import { parseJson, route } from "@/server/http";
import { sendOrderConfirmation } from "@/server/services/email.service";
import { verifyPayment } from "@/server/services/orders.service";
import { verifyPaymentSchema } from "@/server/validators/checkout.validator";

export const runtime = "nodejs";

/**
 * The browser's post-payment handoff — the fast path for the shopper's own tab.
 * Not the source of truth: /api/webhooks/razorpay settles the same order
 * server-to-server, so a refusal here costs a confirmation response, never a
 * paid order.
 */
export const POST = route("checkout/verify", async (request: Request) => {
  const user = await requireUser();
  const body = await parseJson(request, verifyPaymentSchema);

  const result = await verifyPayment({
    razorpayOrderId: body.razorpay_order_id,
    razorpayPaymentId: body.razorpay_payment_id,
    signature: body.razorpay_signature,
    userId: user.id,
  });

  // Only the caller that won the claim inside the settle transaction sends.
  // Cannot throw, by contract, so a mail failure never turns a successful
  // payment into an error the customer sees.
  if (result.shouldSendConfirmation) await sendOrderConfirmation(result.orderId);

  return NextResponse.json({ ok: true, orderId: result.orderId });
});
