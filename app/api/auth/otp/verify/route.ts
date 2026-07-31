import { NextResponse } from "next/server";
import { z } from "zod";

import { phoneRegex } from "@/server/auth/otp";
import { parseJson, route } from "@/server/http";
import { verifyOtp } from "@/server/services/otp.service";

export const runtime = "nodejs";

const schema = z.object({
  phone: z.string().regex(phoneRegex, "Enter a 10-digit mobile number."),
  // Message spelled out rather than left to zod's default "Invalid", which is
  // what the customer would otherwise be shown.
  code: z.string().regex(/^[0-9]{6}$/, "Enter the 6-digit code."),
});

/**
 * Checks a code and hands back a short-lived signed ticket.
 *
 * It does NOT sign anyone in — the ticket goes to the Credentials provider,
 * which is the only thing that does.
 */
export const POST = route("otp/verify", async (request: Request) => {
  const body = await parseJson(request, schema);
  const { ticket } = await verifyOtp(body);
  return NextResponse.json({ ok: true, ticket });
});
