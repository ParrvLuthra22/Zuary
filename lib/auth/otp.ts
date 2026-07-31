import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
/** How long the hand-off token from verify → signIn stays valid. */
export const OTP_TICKET_TTL_MS = 2 * 60 * 1000;

export const phoneRegex = /^[6-9][0-9]{9}$/;

/** Cryptographic RNG, not Math.random — this is a credential. */
export const generateCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is required to sign OTP tickets.");
  return value;
}

/**
 * The hand-off between "this phone proved itself" and "sign this person in".
 *
 * This is the part that must not be a phone number.
 *
 * A Credentials provider that accepts `{ phone }` and signs in whoever it names
 * is an authentication bypass with extra steps: the provider endpoint is a
 * public POST, so anyone could post any number and become that user without
 * ever seeing a code. So verify issues a ticket — phone, expiry and a nonce,
 * HMAC'd with AUTH_SECRET — and the provider accepts nothing else. Only our
 * server can mint one, it is good for two minutes, and it names the phone it
 * was issued for.
 */
export function issueTicket(phone: string): string {
  const payload = `${phone}.${Date.now() + OTP_TICKET_TTL_MS}.${randomInt(1e9)}`;
  const mac = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${mac}`;
}

export function verifyTicket(ticket: string): { phone: string } | null {
  const [encoded, mac] = ticket.split(".");
  if (!encoded || !mac) return null;

  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = createHmac("sha256", secret()).update(payload).digest("hex");

  // Constant-time: a fast reject on the first wrong byte leaks how much of a
  // forged MAC was right, which is enough to build one byte by byte.
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const [phone, expiresAt] = payload.split(".");
  if (!phone || !expiresAt) return null;
  if (Number(expiresAt) < Date.now()) return null;
  if (!phoneRegex.test(phone)) return null;

  return { phone };
}

/**
 * Sends the code.
 *
 * Live sending is gated on ENABLE_PHONE_OTP because it cannot go out until DLT
 * registration completes with TRAI — an unregistered template is rejected by
 * the operator, and repeated attempts risk the sender id. With the flag off the
 * code is logged instead, so the whole flow is exercisable locally.
 *
 * The raw code is never logged in production, whatever the flag says.
 */
export async function sendOtp(phone: string, code: string) {
  const enabled = process.env.ENABLE_PHONE_OTP === "true";

  if (!enabled) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[otp] ${phone} → ${code} (not sent; ENABLE_PHONE_OTP is off)`);
    }
    return { ok: true as const, sent: false };
  }

  const key = process.env.MSG91_AUTH_KEY;
  const template = process.env.MSG91_DLT_TEMPLATE_ID;
  if (!key || !template) {
    console.error("[otp] MSG91 is not configured; cannot send.");
    return { ok: false as const, sent: false };
  }

  try {
    const res = await fetch("https://control.msg91.com/api/v5/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json", authkey: key },
      body: JSON.stringify({
        template_id: template,
        mobile: `91${phone}`,
        otp: code,
      }),
    });
    if (!res.ok) {
      console.error("[otp] MSG91 rejected the send", res.status);
      return { ok: false as const, sent: false };
    }
    return { ok: true as const, sent: true };
  } catch (error) {
    console.error("[otp] MSG91 send failed", error);
    return { ok: false as const, sent: false };
  }
}
