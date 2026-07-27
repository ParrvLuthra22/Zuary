import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqualHex(a: string, b: string) {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function requireSecret(name: "RAZORPAY_KEY_SECRET" | "RAZORPAY_WEBHOOK_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. See .env.example.`);
  return value;
}

/**
 * Checkout handoff signature: HMAC-SHA256 of `<order_id>|<payment_id>` keyed
 * with the API secret.
 */
export function verifyPaymentSignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}) {
  const expected = createHmac("sha256", requireSecret("RAZORPAY_KEY_SECRET"))
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");
  return safeEqualHex(expected, input.signature);
}

/**
 * Webhook signature: HMAC-SHA256 of the raw request body keyed with the webhook
 * secret. Must be given the body exactly as received — re-serialised JSON will
 * not match.
 */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const expected = createHmac("sha256", requireSecret("RAZORPAY_WEBHOOK_SECRET"))
    .update(rawBody)
    .digest("hex");
  return safeEqualHex(expected, signature);
}
