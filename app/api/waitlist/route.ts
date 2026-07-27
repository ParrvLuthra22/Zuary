import { NextResponse } from "next/server";
import { z } from "zod";

import { addToWaitlist } from "@/lib/db/queries";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email("That email does not look right."),
  source: z.string().max(64).default("site"),
});

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
