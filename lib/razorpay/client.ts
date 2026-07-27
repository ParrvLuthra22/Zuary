import Razorpay from "razorpay";

let cached: Razorpay | undefined;

export function razorpay() {
  if (cached) return cached;

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error(
      "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set. See .env.example.",
    );
  }

  cached = new Razorpay({ key_id, key_secret });
  return cached;
}

/** Razorpay works in paise. Our catalogue is in rupees. */
export const toPaise = (rupees: number) => Math.round(rupees * 100);
export const toRupees = (paise: number) => Math.round(paise) / 100;

export const RAZORPAY_CURRENCY = "INR";
