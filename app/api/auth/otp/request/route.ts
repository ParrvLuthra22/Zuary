import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { OTP_TTL_MS, generateCode, phoneRegex, sendOtp } from "@/lib/auth/otp";
import { db } from "@/lib/db";
import { otpCodes } from "@/lib/db/schema";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  phone: z.string().regex(phoneRegex, "Ten digits, starting 6-9."),
});

/**
 * Issues an OTP.
 *
 * Always answers { ok: true } once the input is well-formed — including for a
 * number that has never been seen. Distinguishing "sent" from "no such user"
 * turns this endpoint into a way to enumerate which phone numbers hold accounts,
 * which is exactly the list a credential-stuffer wants.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid phone." },
      { status: 422 },
    );
  }
  const { phone } = parsed.data;

  /* Two buckets. Per-phone stops one number being spammed with texts, which
     costs us money and annoys whoever owns it. Per-IP stops one machine
     cycling through numbers to do the same at scale. */
  const byPhone = await rateLimit("otp-request-phone", phone);
  if (byPhone.limited) {
    return NextResponse.json(
      { error: "Too many codes requested. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(byPhone.retryAfterSec) } },
    );
  }
  const byIp = await rateLimit("otp-request-ip", clientIp(request));
  if (byIp.limited) {
    return NextResponse.json(
      { error: "Too many codes requested. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfterSec) } },
    );
  }

  try {
    const code = generateCode();
    // Only the hash is stored. A dump of otp_codes cannot be replayed to sign
    // in as anyone.
    const codeHash = await hash(code, 10);

    await db.insert(otpCodes).values({
      phone,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    await sendOtp(phone, code);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[otp/request]", error);
    // Still generic: an error here must not become a signal either.
    return NextResponse.json({ ok: true });
  }
}
