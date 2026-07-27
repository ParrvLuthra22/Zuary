import { NextResponse } from "next/server";

import { checkoutSchema, priceCart } from "@/lib/checkout";
import { createOrder, getVariantsForSlugs } from "@/lib/db/queries";
import {
  RAZORPAY_CURRENCY,
  razorpay,
  toPaise,
} from "@/lib/razorpay/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Check the highlighted fields.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const { email, phone, address, items } = parsed.data;

  // Prices come from our catalogue, never from the request body.
  const { lines, subtotalInr, shippingInr, totalInr } = priceCart(items);
  if (lines.length === 0 || totalInr <= 0) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }

  try {
    // Resolve variants and confirm there is stock before taking money.
    const variants = await getVariantsForSlugs(lines.map((l) => l.slug));
    const key = (slug: string, size: string) => `${slug}:${size}`;
    const bySku = new Map(
      variants.map((v) => [key(v.productSlug, v.size), v] as const),
    );

    const orderItems = [];
    for (const line of lines) {
      const variant = bySku.get(key(line.slug, line.size));
      if (!variant) {
        return NextResponse.json(
          { error: `${line.slug.toUpperCase()} ${line.size} is not available.` },
          { status: 409 },
        );
      }
      if (variant.stock < line.qty) {
        return NextResponse.json(
          { error: `${line.slug.toUpperCase()} ${line.size} is out of stock.` },
          { status: 409 },
        );
      }
      orderItems.push({
        variantId: variant.variantId,
        productSlug: line.slug,
        size: line.size,
        qty: line.qty,
        unitPriceInr: line.unitPriceInr,
      });
    }

    const rzpOrder = await razorpay().orders.create({
      amount: toPaise(totalInr),
      currency: RAZORPAY_CURRENCY,
      receipt: `zuary_${Date.now()}`,
      notes: { email, phone },
    });

    const order = await createOrder({
      email,
      phone,
      address,
      subtotalInr,
      shippingInr,
      totalInr,
      razorpayOrderId: rzpOrder.id,
      items: orderItems,
    });

    return NextResponse.json({
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("[checkout/create-order]", error);
    return NextResponse.json(
      { error: "Could not start checkout. Try again." },
      { status: 500 },
    );
  }
}
