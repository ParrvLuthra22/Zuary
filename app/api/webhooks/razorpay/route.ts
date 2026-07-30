import { NextResponse } from "next/server";

import { markOrderFailed, settleOrderPaid } from "@/lib/db/settle";
import { sendOrderConfirmation } from "@/lib/email/order-confirmation";
import { verifyWebhookSignature } from "@/lib/razorpay/verify";

export const runtime = "nodejs";

type RazorpayWebhook = {
  event: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string } };
  };
};

/**
 * The source of truth for payment state. /checkout/verify is only the fast
 * path for the shopper's own tab; if it never runs, this still settles.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Unsigned." }, { status: 400 });
  }

  // Raw body, verified before anything parses it. Re-serialising JSON changes
  // the bytes and the HMAC would never match.
  const raw = await request.text();

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Signature mismatch." }, { status: 400 });
  }

  let event: RazorpayWebhook;
  try {
    event = JSON.parse(raw) as RazorpayWebhook;
  } catch {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  const entity = event.payload?.payment?.entity;
  const razorpayOrderId = entity?.order_id;
  const razorpayPaymentId = entity?.id;

  // Signature was good, so acknowledge rather than make Razorpay retry.
  if (!razorpayOrderId || !razorpayPaymentId) {
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  try {
    switch (event.event) {
      case "payment.captured": {
        const result = await settleOrderPaid(razorpayOrderId, razorpayPaymentId);

        /*
         * Sent from here as well as from /checkout/verify, because either can
         * be the one that settles: if the customer closes the tab after paying,
         * verify never runs and this is the only path left.
         *
         * shouldSendConfirmation is claimed atomically inside the settle
         * transaction, so of the two racing callers exactly one sends.
         */
        if (result.status === "paid" && result.shouldSendConfirmation) {
          await sendOrderConfirmation(result.orderId);
        }

        return NextResponse.json({
          ok: true,
          status: result.status,
          idempotent:
            result.status === "paid" ? result.alreadySettled : undefined,
        });
      }
      case "payment.failed": {
        await markOrderFailed(razorpayOrderId, razorpayPaymentId);
        return NextResponse.json({ ok: true, status: "failed" });
      }
      default:
        return NextResponse.json({ ok: true, ignored: event.event });
    }
  } catch (error) {
    console.error("[webhooks/razorpay]", error);
    // 500 asks Razorpay to retry, which is what a transient fault deserves.
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }
}
