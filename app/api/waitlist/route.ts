import { NextResponse } from "next/server";
import { z } from "zod";

import { addToWaitlist } from "@/lib/db/queries";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sendWaitlistWelcome } from "@/lib/email/waitlist";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email("That email does not look right."),
  source: z.string().max(64).default("site"),
  /* The notify drawer sends these; every other form omits them. Size is
     optional in the drawer too, so an empty string has to pass. */
  product: z.enum(["kohl", "dhool", "reeh"]).optional(),
  size: z.enum(["S", "M", "L", "XL"]).optional(),
});

export async function POST(request: Request) {
  const limit = await rateLimit("waitlist", clientIp(request));
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many sign-ups. Try again in a few minutes." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      },
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
    const email = parsed.data.email.toLowerCase().trim();

    await addToWaitlist(email, parsed.data.source, {
      productSlug: parsed.data.product,
      size: parsed.data.size,
    });

    /*
     * Welcome mail after the row is safely written, and awaited only so a
     * failure gets logged — sendEmail never throws, so this cannot turn a
     * successful signup into an error. Someone on the list who did not get the
     * mail is a far better outcome than someone who is not on the list.
     */
    await sendWaitlistWelcome({
      email,
      productSlug: parsed.data.product,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[waitlist]", error);
    return NextResponse.json({ error: "Could not add you." }, { status: 500 });
  }
}
