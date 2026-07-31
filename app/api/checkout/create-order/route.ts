import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/server/auth/config";
import { checkoutSchema } from "@/shared/validators/checkout";
import { shippingFor } from "@/shared/constants/policies";
import { db } from "@/server/db";
import { createAddress, listAddresses } from "@/server/db/queries";
import { orderItems, orders, products, variants } from "@/server/db/schema";
import { clientIp, rateLimit } from "@/server/services/rate-limit.service";
import { RAZORPAY_CURRENCY, razorpay, toPaise } from "@/server/services/payments.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = await rateLimit("create-order", clientIp(request));
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  /*
   * Payment requires an account.
   *
   * Checked before the body is even parsed, so an unauthenticated caller learns
   * nothing about the shape of the request. Middleware already keeps signed-out
   * visitors off /checkout, but this endpoint is reachable directly — a gate on
   * the page is not a gate on the API.
   */
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to complete your order." },
      { status: 401 },
    );
  }

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

  const { contact, address, items, saveAddress } = parsed.data;

  try {
    // Prices and stock come from the database. Nothing the browser sent about
    // money is read.
    const slugs = [...new Set(items.map((i) => i.slug))];
    const rows = await db
      .select({
        variantId: variants.id,
        stock: variants.stock,
        priceInr: products.priceInr,
        productSlug: products.slug,
        size: variants.size,
        active: products.active,
      })
      .from(variants)
      .innerJoin(products, eq(variants.productId, products.id))
      .where(inArray(products.slug, slugs));

    const key = (slug: string, size: string) => `${slug}:${size}`;
    const byVariant = new Map(rows.map((r) => [key(r.productSlug, r.size), r]));

    const priced: {
      variantId: number;
      productSlug: string;
      size: string;
      qty: number;
      unitPriceInr: number;
    }[] = [];

    for (const item of items) {
      const variant = byVariant.get(key(item.slug, item.size));
      if (!variant || !variant.active) {
        return NextResponse.json(
          { error: `${item.slug.toUpperCase()} ${item.size} is not available.` },
          { status: 409 },
        );
      }
      if (variant.stock < item.qty) {
        return NextResponse.json(
          {
            error: `${item.slug.toUpperCase()} ${item.size}: only ${variant.stock} left.`,
          },
          { status: 409 },
        );
      }
      priced.push({
        variantId: variant.variantId,
        productSlug: item.slug,
        size: item.size,
        qty: item.qty,
        unitPriceInr: variant.priceInr,
      });
    }

    const subtotalInr = priced.reduce(
      (sum, l) => sum + l.unitPriceInr * l.qty,
      0,
    );
    const shippingInr = shippingFor(subtotalInr);
    const totalInr = subtotalInr + shippingInr;

    // Our row first, so the Razorpay receipt can carry our id.
    const [order] = await db
      .insert(orders)
      .values({
        userId,
        status: "created",
        email: contact.email,
        phone: contact.phone,
        addressJson: address,
        subtotalInr,
        shippingInr,
        totalInr,
      })
      .returning();

    const rzpOrder = await razorpay().orders.create({
      amount: toPaise(totalInr),
      currency: RAZORPAY_CURRENCY,
      receipt: order.id,
      notes: { ourOrderId: order.id, email: contact.email },
    });

    await db
      .update(orders)
      .set({ razorpayOrderId: rzpOrder.id, updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    await db.insert(orderItems).values(
      priced.map((line) => ({
        orderId: order.id,
        variantId: line.variantId,
        productSlug: line.productSlug,
        size: line.size,
        qty: line.qty,
        unitPriceInr: line.unitPriceInr,
      })),
    );

    /*
     * Keep the address on the account, if asked.
     *
     * After the order is safely written, and wrapped so it can never fail the
     * checkout: a customer who cannot save an address should still be able to
     * pay. createAddress promotes the first address to default on its own.
     */
    if (saveAddress) {
      try {
        const existing = await listAddresses(userId);
        // Same street and PIN is the same address as far as a customer is
        // concerned — re-entering it at checkout should not add a duplicate.
        const duplicate = existing.some(
          (row) =>
            row.line1.trim().toLowerCase() ===
              address.line1.trim().toLowerCase() &&
            row.pincode === address.pincode,
        );

        if (!duplicate) {
          await createAddress({
            userId,
            label: null,
            fullName: address.name,
            phone: contact.phone,
            line1: address.line1,
            line2: address.line2 || null,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            isDefault: false,
          });
        }
      } catch (error) {
        console.error("[checkout/create-order] save address", error);
      }
    }

    return NextResponse.json({
      ourOrderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      // Publishable id only. The secret never leaves the server.
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("[checkout/create-order]", error);
    return NextResponse.json(
      { error: "Could not start checkout. Try again." },
      { status: 500 },
    );
  }
}
