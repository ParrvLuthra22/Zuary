import { NextResponse } from "next/server";
import { z } from "zod";

import { addToWaitlist } from "@/lib/db/queries";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email("That email does not look right."),
  source: z.string().max(64).default("site"),
});

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

/**
 * Per-instance rate limit. Good enough to stop a form being hammered from one
 * machine; it does not survive a restart and is not shared between serverless
 * instances, so it is a speed bump rather than a real quota.
 */
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }

  recent.push(now);
  hits.set(ip, recent);

  // Opportunistic sweep so the map cannot grow without bound.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return false;
}

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  if (rateLimited(clientIp(request))) {
    return NextResponse.json(
      { error: "Too many sign-ups. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid email." },
      { status: 422 },
    );
  }

  try {
    await addToWaitlist(
      parsed.data.email.toLowerCase().trim(),
      parsed.data.source,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[waitlist]", error);
    return NextResponse.json({ error: "Could not add you." }, { status: 500 });
  }
}
