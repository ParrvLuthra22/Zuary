type Bucket = { key: string; max: number; windowMs: number };

const hits = new Map<string, number[]>();

/**
 * Per-instance rate limit. It does not survive a restart and is not shared
 * between serverless instances, so treat it as a speed bump against a single
 * machine hammering an endpoint, not as a real quota.
 */
export function rateLimit(ip: string, { key, max, windowMs }: Bucket) {
  const id = `${key}:${ip}`;
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

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
