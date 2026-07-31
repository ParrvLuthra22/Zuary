import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/server/db";

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
 * `SELECT 1` on purpose: it proves the connection round-trips without touching
 * a table, so it cannot be slowed by whatever else is running.
 */
export async function GET() {
  let database: "up" | "down" = "down";
  try {
    await db.execute(sql`select 1`);
    database = "up";
  } catch {
    database = "down";
  }

  return NextResponse.json(
    {
      ok: true,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      db: database,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
