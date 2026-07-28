import { NextResponse } from "next/server";

import { verifySchema } from "@/lib/checkout";
import { markOrderFailed, settleOrderPaid } from "@/lib/db/settle";
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
    return NextResponse.json(
      { error: "Missing payment fields." },
      { status: 422 },
    );
  }

  const {
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: signature,
  } = parsed.data;

  // HMAC of `<order_id>|<payment_id>` keyed with the API secret, compared in
  // constant time. A mismatch means the handoff was tampered with.
  if (
    !verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature })
  ) {
    await markOrderFailed(razorpayOrderId).catch(() => {});
    return NextResponse.json({ error: "Signature mismatch." }, { status: 400 });
  }

  try {
    const result = await settleOrderPaid(razorpayOrderId, razorpayPaymentId);

    if (result.status === "unknown-order") {
      return NextResponse.json({ error: "Unknown order." }, { status: 404 });
    }
    if (result.status === "oversold") {
      return NextResponse.json(
        {
          error:
            "Payment received but stock ran out. Support will be in touch.",
          orderId: result.orderId,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true, orderId: result.orderId });
  } catch (error) {
    console.error("[checkout/verify]", error);
    return NextResponse.json(
      { error: "Could not confirm the order." },
      { status: 500 },
    );
  }
}
