import { NextResponse } from "next/server";

import { requireUser } from "@/server/auth/guards";
import { limit, parseJson, route } from "@/server/http";
import { createOrder } from "@/server/services/orders.service";
import { saveAddressIfNew } from "@/server/services/addresses.service";
import { clientIp } from "@/server/services/rate-limit.service";
import { createOrderSchema } from "@/server/validators/checkout.validator";

export const runtime = "nodejs";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID;

export const POST = route("checkout/create-order", async (request: Request) => {
  const limited = await limit(
    "create-order",
    clientIp(request),
    "Too many attempts. Try again shortly.",
  );
  if (limited) return limited;

  // Before the body is parsed, so an unauthenticated caller learns nothing
  // about the shape of the request. Middleware guards /checkout, but this
  // endpoint is reachable directly and a gate on the page is not a gate here.
  const user = await requireUser();
  const body = await parseJson(request, createOrderSchema);
  const { contact, address } = body;

  const order = await createOrder({ userId: user.id, contact, address, items: body.items });

  // After the order is safely written, and never able to fail it: someone who
  // cannot save an address should still be able to pay.
  if (body.saveAddress) await saveAddressIfNew(user.id, address, contact.phone);

  // keyId is the publishable id only; the secret never leaves the server.
  return NextResponse.json({ ...order, ourOrderId: order.orderId, keyId: PUBLISHABLE_KEY });
});
