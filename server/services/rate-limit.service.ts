import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type LimitResult = { limited: boolean; retryAfterSec: number };

/* ── Buckets ───────────────────────────────────────────────────
   Named here rather than at each call site so the numbers are reviewable in
   one place, and so two routes cannot drift to different limits for the same
   kind of abuse. */
export const LIMITS = {
  waitlist: { max: 5, window: "10 m" },
  "create-order": { max: 10, window: "10 m" },
  "otp-request-phone": { max: 3, window: "15 m" },
  "otp-request-ip": { max: 10, window: "1 h" },
  "magic-link": { max: 5, window: "1 h" },
} as const;

export type LimitName = keyof typeof LIMITS;

const parseWindow = (w: string) => {
  const [n, unit] = w.split(" ");
  const ms = { s: 1000, m: 60_000, h: 3_600_000 }[unit as "s" | "m" | "h"] ?? 1000;
  return Number(n) * ms;
};

/* ── Redis ─────────────────────────────────────────────────── */

let redis: Redis | undefined;
let configured: boolean | undefined;

function client() {
  if (configured === false) return undefined;
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    configured = false;
    return undefined;
  }
  redis = new Redis({ url, token });
  configured = true;
  return redis;
}

const limiters = new Map<LimitName, Ratelimit>();

function limiter(name: LimitName) {
  const existing = limiters.get(name);
  if (existing) return existing;

  const r = client();
  if (!r) return undefined;

  const { max, window } = LIMITS[name];
  const made = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(max, window),
    prefix: `zuary:${name}`,
    analytics: false,
  });
  limiters.set(name, made);
  return made;
}

/* ── In-memory fallback ────────────────────────────────────── */

const hits = new Map<string, number[]>();

let warned = false;

/**
 * Per-instance fallback, used only when Upstash is not configured.
 *
 * Kept deliberately, but understand what it is not: on serverless every cold
 * start gets a fresh Map, so a distributed caller simply spreads across
 * instances and the quota never binds. It is a speed bump for local development
 * and for a single long-lived server. Production must set
 * UPSTASH_REDIS_REST_URL and _TOKEN — the warning fires once per process so it
 * shows up in the logs without drowning them.
 */
function memoryLimit(id: string, max: number, windowMs: number): LimitResult {
  if (!warned && process.env.NODE_ENV === "production") {
    console.warn(
      "[rate-limit] Upstash is not configured — falling back to per-instance limits, which do not hold across serverless instances.",
    );
    warned = true;
  }

  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    hits.set(id, recent);
    return { limited: true, retryAfterSec: Math.ceil(windowMs / 1000) };
  }

  recent.push(now);
  hits.set(id, recent);

  // Opportunistic sweep so the map cannot grow without bound.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return { limited: false, retryAfterSec: 0 };
}

/**
 * Consumes one token from a bucket.
 *
 * `identifier` is whatever that bucket counts — an IP, a phone, an email.
 *
 * Fails OPEN when Redis itself errors. A limiter that takes checkout down
 * because its own dependency blipped causes more damage than the abuse it
 * exists to stop; the failure is logged so it is visible rather than silent.
 */
export async function rateLimit(
  name: LimitName,
  identifier: string,
): Promise<LimitResult> {
  const { max, window } = LIMITS[name];
  const rl = limiter(name);

  if (!rl) return memoryLimit(`${name}:${identifier}`, max, parseWindow(window));

  try {
    const { success, reset } = await rl.limit(identifier);
    return {
      limited: !success,
      retryAfterSec: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
    };
  } catch (error) {
    console.error("[rate-limit] Redis failed, allowing through", error);
    return { limited: false, retryAfterSec: 0 };
  }
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
