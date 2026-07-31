import { compare } from "bcryptjs";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { OTP_MAX_ATTEMPTS, issueTicket, phoneRegex } from "@/lib/auth/otp";
import { db } from "@/lib/db";
import { otpCodes } from "@/lib/db/schema";

export const runtime = "nodejs";

const schema = z.object({
  phone: z.string().regex(phoneRegex),
  code: z.string().regex(/^[0-9]{6}$/),
});

/**
 * Checks a code and, on success, hands back a short-lived signed ticket.
 *
 * It does NOT sign anyone in. The ticket goes to the Credentials provider,
 * which is the only thing that does — see lib/auth/otp.ts for why the provider
 * must not accept a bare phone number.
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
    return NextResponse.json({ error: "Invalid code." }, { status: 422 });
  }
  const { phone, code } = parsed.data;

  try {
    const [row] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.phone, phone),
          isNull(otpCodes.consumedAt),
          gt(otpCodes.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    // Same answer whether there is no code, it expired, or it is wrong.
    const reject = () =>
      NextResponse.json(
        { error: "That code is not right, or it has expired." },
        { status: 401 },
      );

    if (!row) return reject();

    if (row.attempts >= OTP_MAX_ATTEMPTS) {
      // Burn it rather than leave a code alive that has been guessed at.
      await db
        .update(otpCodes)
        .set({ consumedAt: new Date() })
        .where(eq(otpCodes.id, row.id));
      return reject();
    }

    /* Count the attempt BEFORE comparing. If the comparison throws, or the
       process dies mid-request, the attempt must still have cost something —
       otherwise the counter is trivially avoidable. */
    await db
      .update(otpCodes)
      .set({ attempts: row.attempts + 1 })
      .where(eq(otpCodes.id, row.id));

    // bcrypt's compare is constant-time for a given hash, so a wrong code
    // takes the same work as a right one.
    const ok = await compare(code, row.codeHash);
    if (!ok) return reject();

    await db
      .update(otpCodes)
      .set({ consumedAt: new Date() })
      .where(eq(otpCodes.id, row.id));

    return NextResponse.json({ ok: true, ticket: issueTicket(phone) });
  } catch (error) {
    console.error("[otp/verify]", error);
    return NextResponse.json({ error: "Could not verify." }, { status: 500 });
  }
}
