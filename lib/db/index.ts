import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

/**
 * Resolved lazily so that importing this module during `next build` — or in any
 * environment without a database — does not throw. The error only surfaces when
 * a query actually runs.
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
  return drizzle(neon(connectionString()), { schema });
}

export const db = new Proxy({} as ReturnType<typeof create>, {
  get(_target, prop, receiver) {
    cached ??= create();
    return Reflect.get(cached, prop, receiver);
  },
});

export { schema };
