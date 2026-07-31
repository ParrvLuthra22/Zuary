import { NextResponse } from "next/server";

import { limit, parseJson, route } from "@/server/http";
import { clientIp } from "@/server/services/rate-limit.service";
import { joinWaitlist } from "@/server/services/waitlist.service";
import { waitlistSchema } from "@/server/validators/checkout.validator";

export const runtime = "nodejs";

export const POST = route("waitlist", async (request: Request) => {
  const limited = await limit(
    "waitlist",
    clientIp(request),
    "Too many sign-ups. Try again in a few minutes.",
  );
  if (limited) return limited;

  // No guard: joining the waitlist is deliberately open to anyone.
  const body = await parseJson(request, waitlistSchema);
  await joinWaitlist({
    email: body.email,
    source: body.source,
    productSlug: body.product,
    size: body.size,
  });

  return NextResponse.json({ ok: true });
});
