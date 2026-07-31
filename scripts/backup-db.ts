import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { addresses, orderItems, orders, users } from "../server/db/schema";

/**
 * Dumps the tables that cannot be regenerated.
 *
 * Neon has branching and point-in-time restore, and both are better than this
 * for an ordinary rollback. This exists for the cases they do not cover: the
 * account being suspended, a billing lapse, a console mistake, or simply
 * needing to read last month's orders on a laptop with no network. A file you
 * control is worth having on the day something goes wrong with the thing that
 * was supposed to protect you.
 *
 * Products, variants and images are deliberately not dumped — they are seeded
 * from the repository and a backup of them is a backup of code.
 *
 * Usage:  npm run backup            → ./backups/2026-07-31T12-00-00Z/
 *         BACKUP_DIR=/vol npm run backup
 */

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const db = drizzle(neon(url));

/**
 * The dump is plain JSON, one file per table, not a pg_dump.
 *
 * A custom-format dump needs the matching pg_restore to be readable at all. A
 * JSON file can be opened in any editor and grepped at 3am, which is when this
 * will actually be wanted. Restoring it takes a script — that is the trade, and
 * it is the right way round: reading is urgent, restoring is deliberate.
 */
async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + "Z";
  const dir = join(process.env.BACKUP_DIR ?? "./backups", stamp);
  await mkdir(dir, { recursive: true });

  const tables = [
    ["orders", orders],
    ["order_items", orderItems],
    ["users", users],
    ["addresses", addresses],
  ] as const;

  const summary: Record<string, number> = {};

  for (const [name, table] of tables) {
    const rows = await db.select().from(table);
    await writeFile(
      join(dir, `${name}.json`),
      JSON.stringify(rows, null, 2),
      "utf8",
    );
    summary[name] = rows.length;
    console.log(`  ${name.padEnd(12)} ${rows.length} rows`);
  }

  /*
   * A manifest beside the data. Six months from now the useful question is
   * "what was this a backup OF" — which database, at what time, on what commit.
   * The host is recorded without its credentials.
   */
  await writeFile(
    join(dir, "manifest.json"),
    JSON.stringify(
      {
        takenAt: new Date().toISOString(),
        host: new URL(url!).host,
        database: new URL(url!).pathname.replace(/^\//, ""),
        commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        rows: summary,
      },
      null,
      2,
    ),
    "utf8",
  );

  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  console.log(`\nWrote ${total} rows to ${dir}`);

  /*
   * An empty orders table is either a brand-new database or a catastrophe, and
   * a backup script that cheerfully writes a zero-row file over yesterday's
   * good one turns the second into the first. Non-zero exit so a cron job
   * reports it rather than logging success.
   */
  if (summary.orders === 0) {
    console.error("\nWARNING: zero orders. Check DATABASE_URL points where you think.");
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
