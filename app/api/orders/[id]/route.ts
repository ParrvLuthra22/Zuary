import { NextResponse } from "next/server";

import { auth } from "@/server/auth/config";
import { getOrderForUser } from "@/server/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Order status, for the confirmation page to poll while the webhook and the
 * browser redirect race each other.
 *
 * Scoped to the session. It previously answered for any valid uuid with no
 * session at all — the body is only `{ status }`, but that still let anyone
 * holding an id (from a shared link, a browser history, a support thread) watch
 * a stranger's order move through paid and shipped. Ownership now lives in the
 * query, so another customer's id and a nonexistent one are indistinguishable.
 *
 * Safe to require a session here: payment has required an account since B04, so
 * anyone legitimately polling this is signed in.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const order = await getOrderForUser(id, userId);
    if (!order) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ status: order.status });
  } catch {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }
}
