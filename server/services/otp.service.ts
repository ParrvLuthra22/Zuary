import "server-only";

import { compare, hash } from "bcryptjs";
import { and, desc, eq, gt, isNull } from "drizzle-orm";

import {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  generateCode,
  issueTicket,
  sendOtp,
} from "@/server/auth/otp";
import { db } from "@/server/db";
import { otpCodes } from "@/server/db/schema";
import { UnauthorizedError } from "@/shared/errors";

/**
 * Issues a one-time code for a phone number.
 *
 * Only the hash is stored: a dump of otp_codes cannot be replayed to sign in as
 * anyone. The plaintext exists for exactly as long as it takes to hand it to
 * the SMS provider, and is never returned to the caller or logged.
 *
 * Returns void rather than any indication of what happened. The route answers
 * `{ ok: true }` for every well-formed number, including ones that have never
 * been seen — telling "sent" apart from "no such user" turns this into a way to
 * enumerate which numbers hold accounts, which is exactly the list a
 * credential-stuffer wants.
 */
export async function issueOtp(phone: string): Promise<void> {
  const code = generateCode();
  const codeHash = await hash(code, 10);

  await db.insert(otpCodes).values({
    phone,
    codeHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  await sendOtp(phone, code);
}

/**
 * Checks a code and, on success, returns a short-lived signed ticket.
 *
 * This does NOT sign anyone in. The ticket goes to the Credentials provider,
 * which is the only thing that does — see server/auth/otp.ts for why that
 * provider must never accept a bare phone number.
 *
 * Every failure path throws the same UnauthorizedError with the same message.
 * No code, an expired code, a burnt code and a wrong code are indistinguishable
 * from outside, so nothing here can be used to probe which numbers have a live
 * code outstanding.
 */
export async function verifyOtp(input: {
  phone: string;
  code: string;
}): Promise<{ ticket: string }> {
  const reject = () =>
    new UnauthorizedError("That code is not right, or it has expired.");

  const [row] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phone, input.phone),
        isNull(otpCodes.consumedAt),
        gt(otpCodes.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!row) throw reject();

  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    // Burn it rather than leave a code alive that has been guessed at.
    await db
      .update(otpCodes)
      .set({ consumedAt: new Date() })
      .where(eq(otpCodes.id, row.id));
    throw reject();
  }

  /* Count the attempt BEFORE comparing. If the comparison throws, or the
     process dies mid-request, the attempt must still have cost something —
     otherwise the counter is trivially avoidable. */
  await db
    .update(otpCodes)
    .set({ attempts: row.attempts + 1 })
    .where(eq(otpCodes.id, row.id));

  // bcrypt's compare is constant-time for a given hash, so a wrong code costs
  // the same work as a right one.
  if (!(await compare(input.code, row.codeHash))) throw reject();

  await db
    .update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(eq(otpCodes.id, row.id));

  return { ticket: issueTicket(input.phone) };
}
