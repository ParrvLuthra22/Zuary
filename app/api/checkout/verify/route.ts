import { NextResponse } from "next/server";

import { verifySchema } from "@/lib/checkout";
import {
  decrementStockForOrder,
  getOrderByRazorpayOrderId,
  markOrderStatus,
} from "@/lib/db/queries";
import { verifyPaymentSignature } from "@/lib/razorpay/verify";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing payment fields." }, { status: 422 });
  }

  const {
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: signature,
  } = parsed.data;

  const valid = verifyPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId,
    signature,
  });

  if (!valid) {
    // Signature mismatch means the handoff was tampered with. Do not trust it.
    await markOrderStatus(razorpayOrderId, "failed").catch(() => {});
    return NextResponse.json({ error: "Signature mismatch." }, { status: 400 });
  }

  try {
    const existing = await getOrderByRazorpayOrderId(razorpayOrderId);
    if (!existing) {
      return NextResponse.json({ error: "Unknown order." }, { status: 404 });
    }

    // The webhook may have got here first — settling twice must not double-count.
    if (existing.status === "paid") {
      return NextResponse.json({ ok: true, orderId: existing.id });
    }

    const order = await markOrderStatus(
      razorpayOrderId,
      "paid",
      razorpayPaymentId,
    );
    await decrementStockForOrder(order.id);

    return NextResponse.json({ ok: true, orderId: order.id });
  } catch (error) {
    console.error("[checkout/verify]", error);
    return NextResponse.json(
      { error: "Could not confirm the order." },
      { status: 500 },
    );
  }
}
