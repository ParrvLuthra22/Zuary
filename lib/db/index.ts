import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "./schema";

/**
 * Pooled (WebSocket) rather than the HTTP driver.
 *
 * The HTTP driver is stateless and has no `db.transaction()`, so settling a
 * payment — flip the order to paid and decrement every variant, all or
 * nothing — is not expressible on it. The pool speaks the same Neon protocol
 * and works on serverless, so this is the driver checkout needs.
 */
function connectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  return url;
}

let cached: ReturnType<typeof create> | undefined;

function create() {
  // Node 22 ships a global WebSocket; the driver needs pointing at it.
  if (!neonConfig.webSocketConstructor && typeof WebSocket !== "undefined") {
    neonConfig.webSocketConstructor = WebSocket as never;
  }
  const pool = new Pool({ connectionString: connectionString() });
  return drizzle(pool, { schema });
}

/** Resolved lazily so importing this module without a database does not throw. */
export const db = new Proxy({} as ReturnType<typeof create>, {
  get(_target, prop, receiver) {
    cached ??= create();
    return Reflect.get(cached, prop, receiver);
  },
});

export { schema };
