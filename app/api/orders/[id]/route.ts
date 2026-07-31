import { NextResponse } from "next/server";

import { requireUser } from "@/server/auth/guards";
import { route } from "@/server/http";
import { getOrderById } from "@/server/services/orders.service";
import { NotFoundError } from "@/shared/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Checked before the query: a non-uuid reaches Postgres as a failed cast. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Order status, for the confirmation page to poll while the webhook and the
 * browser redirect race each other.
 *
 * Scoped to the session. The body is only `{ status }`, but unscoped it let
 * anyone holding an id — from a shared link, a browser history, a support
 * thread — watch a stranger's order move through paid and shipped. Ownership
 * lives in the query, so another customer's id and a nonexistent one are
 * indistinguishable.
 */
export const GET = route(
  "orders/:id",
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    if (!UUID.test(id)) throw new NotFoundError();
    const user = await requireUser();
    const order = await getOrderById(id, user.id);
    return NextResponse.json({ status: order.status });
  },
);
