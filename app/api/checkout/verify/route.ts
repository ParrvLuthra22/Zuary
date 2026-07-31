import { NextResponse } from "next/server";

import { auth } from "@/server/auth/config";
import { verifySchema } from "@/shared/validators/checkout";
import { getOrderByRazorpayOrderId } from "@/server/db/queries";
import { markOrderFailed, settleOrderPaid } from "@/server/db/settle";
import { sendOrderConfirmation } from "@/server/services/email.service";
import { verifyPaymentSignature } from "@/server/services/payments.service";

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

  /*
   * Session first, then ownership, and only then the signature.
   *
   * A valid signature proves Razorpay signed this handoff; it does not prove who
   * is replaying it, since the three ids travel through the browser. So the
   * settle is bound to the session as well.
   *
   * The order of these checks is itself the fix for a real hole. A signature
   * mismatch calls markOrderFailed, so while that ran first any anonymous caller
   * who knew a pending razorpayOrderId could POST a junk signature and fail
   * someone else's order out from under them before the webhook landed. Behind
   * the session and ownership checks, the worst anyone can do is fail their own.
   *
   * Being strict here is safe because this route is not the source of truth:
   * /api/webhooks/razorpay settles the same order server-to-server with no
   * session involved. A refusal costs the caller a confirmation response, never
   * a paid order.
   */
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to confirm your order." },
      { status: 401 },
    );
  }

  try {
    const owner = await getOrderByRazorpayOrderId(razorpayOrderId);
    if (!owner || owner.userId !== userId) {
      // Same answer for "not yours" and "does not exist", so probing tells the
      // caller nothing. Logged, because in our own flow this cannot happen.
      if (owner) {
        console.error(
          "[checkout/verify] session does not own order",
          razorpayOrderId,
        );
      }
      return NextResponse.json({ error: "Unknown order." }, { status: 404 });
    }

    // HMAC of `<order_id>|<payment_id>` keyed with the API secret, compared in
    // constant time. A mismatch means the handoff was tampered with.
    if (
      !verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature })
    ) {
      await markOrderFailed(razorpayOrderId).catch(() => {});
      return NextResponse.json(
        { error: "Signature mismatch." },
        { status: 400 },
      );
    }

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

    /*
     * Send only if this call won the claim inside settleOrderPaid's
     * transaction. `alreadySettled` is not the right test — under READ
     * COMMITTED both callers can see an unsettled order and both would think
     * they were first. The claim is a conditional UPDATE, so exactly one wins.
     *
     * Cannot throw, by contract, so a mail failure never turns a successful
     * payment into an error the customer sees.
     */
    if (result.shouldSendConfirmation) {
      await sendOrderConfirmation(result.orderId);
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
