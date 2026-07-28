import { NextResponse } from "next/server";

import { getOrderWithItems } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Status only. The confirmation page polls this while the webhook and the
 * redirect race each other; it deliberately returns nothing identifying.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const order = await getOrderWithItems(id);
    if (!order) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ status: order.status });
  } catch {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }
}
