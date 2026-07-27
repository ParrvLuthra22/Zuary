import { NextResponse } from "next/server";

import {
  decrementStockForOrder,
  getOrderByRazorpayOrderId,
  markOrderStatus,
} from "@/lib/db/queries";
import { verifyWebhookSignature } from "@/lib/razorpay/verify";

export const runtime = "nodejs";

type RazorpayWebhook = {
  event: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string } };
  };
};

export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Unsigned." }, { status: 400 });
  }

  // Must be the raw body — re-serialising JSON changes the bytes and the HMAC.
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

  if (!razorpayOrderId) {
    // Nothing to reconcile, but the signature was good — do not make Razorpay retry.
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  try {
    const order = await getOrderByRazorpayOrderId(razorpayOrderId);
    if (!order) {
      return NextResponse.json({ ok: true, ignored: "unknown order" });
    }

    switch (event.event) {
      case "payment.captured": {
        // /checkout/verify may have already settled this one.
        if (order.status === "paid") break;
        await markOrderStatus(razorpayOrderId, "paid", razorpayPaymentId);
        await decrementStockForOrder(order.id);
        break;
      }
      case "payment.failed": {
        if (order.status === "created") {
          await markOrderStatus(razorpayOrderId, "failed", razorpayPaymentId);
        }
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[webhooks/razorpay]", error);
    // 500 tells Razorpay to retry, which is what we want for a transient fault.
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }
}
