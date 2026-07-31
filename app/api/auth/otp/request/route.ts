import { NextResponse } from "next/server";
import { z } from "zod";

import { phoneRegex } from "@/server/auth/otp";
import { limit, parseJson, route } from "@/server/http";
import { issueOtp } from "@/server/services/otp.service";
import { clientIp } from "@/server/services/rate-limit.service";

export const runtime = "nodejs";

const schema = z.object({
  phone: z.string().regex(phoneRegex, "Ten digits, starting 6-9."),
});

const TOO_MANY = "Too many codes requested. Try again shortly.";

/**
 * Issues an OTP.
 *
 * Always answers { ok: true } once the input is well-formed — including for a
 * number that has never been seen, and including when the write or the send
 * failed. Distinguishing those cases turns this endpoint into a way to
 * enumerate which phone numbers hold accounts.
 */
export const POST = route("otp/request", async (request: Request) => {
  const { phone } = await parseJson(request, schema);

  /* Two buckets. Per-phone stops one number being spammed with texts, which
     costs us money and annoys whoever owns it. Per-IP stops one machine
     cycling through numbers to do the same at scale. */
  const limited =
    (await limit("otp-request-phone", phone, TOO_MANY)) ??
    (await limit("otp-request-ip", clientIp(request), TOO_MANY));
  if (limited) return limited;

  // Swallowed on purpose — see above. An error here must not become a signal
  // either, so it is logged and the answer stays identical.
  await issueOtp(phone).catch((error) => console.error("[otp/request]", error));

  return NextResponse.json({ ok: true });
});
