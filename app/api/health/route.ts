import { NextResponse } from "next/server";

import { checkDatabase } from "@/server/services/health.service";

export const runtime = "nodejs";
/** Uptime checks must never be served from a cache. */
export const dynamic = "force-dynamic";

/**
 * Liveness for uptime monitoring.
 *
 * Answers 200 whenever the app itself is serving, and reports the database
 * separately rather than folding it into the status code. A monitor that pages
 * on any non-200 would otherwise treat a database blip as a total outage, when
 * most of the storefront keeps working without one.
 *
 * Deliberately not wrapped in `route()`: this endpoint must not produce a typed
 * error response. It reports failure as data, in the body, with a 200.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      db: await checkDatabase(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
