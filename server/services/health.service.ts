import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/server/db";

/**
 * Database liveness.
 *
 * `SELECT 1` on purpose: it proves the connection round-trips without touching
 * a table, so it cannot be slowed by whatever else is running.
 *
 * Never throws — a probe that throws is a probe that pages someone. The whole
 * point is to report "down" as data.
 */
export async function checkDatabase(): Promise<"up" | "down"> {
  try {
    await db.execute(sql`select 1`);
    return "up";
  } catch {
    return "down";
  }
}
