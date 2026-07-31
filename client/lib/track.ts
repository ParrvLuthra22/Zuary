"use client";

import "client-only";

import { track as vercelTrack } from "@vercel/analytics";

/**
 * The funnel, as one typed surface.
 *
 * Every event name and every property shape is declared here. A stringly-typed
 * `track("add_to_cart")` scattered through twenty components drifts within a
 * month — someone writes `addToCart`, someone else `add-to-cart`, and the
 * funnel silently splits into three half-populated charts that nobody notices
 * because each one still has data in it.
 *
 * THE RULE: no PII in properties. No email, no phone, no address, no name.
 *
 * That is not only a privacy position, it is what keeps this data usable —
 * Vercel Analytics is not a system of record and anything sent here is
 * effectively permanent and widely readable inside the team. Slugs, sizes,
 * counts and totals describe the funnel completely without describing a person.
 * An orderId is allowed: it is ours, opaque, and resolves to a customer only
 * through our own database.
 */

export type FunnelEvents = {
  product_viewed: { slug: string; price: number };
  size_selected: { slug: string; size: string };
  add_to_cart: { slug: string; size: string; price: number };
  cart_opened: Record<string, never>;
  checkout_started: { itemCount: number; subtotal: number };
  login_required_shown: Record<string, never>;
  login_completed: { method: "google" | "email" | "phone" };
  address_submitted: Record<string, never>;
  payment_initiated: { total: number };
  payment_completed: { orderId: string; total: number };
  payment_failed: { reason: string };
};

export type EventName = keyof FunnelEvents;

/**
 * Property keys that must never be sent, enforced at runtime as well as in the
 * types.
 *
 * The types stop it at a call site that type-checks. This stops it when someone
 * spreads an object in — `track("add_to_cart", { ...product })` compiles
 * happily and would ship whatever `product` happens to contain today.
 */
const FORBIDDEN = new Set([
  "email",
  "phone",
  "name",
  "fullname",
  "address",
  "line1",
  "line2",
  "city",
  "pincode",
  "postcode",
]);

function assertNoPii(event: EventName, properties: Record<string, unknown>) {
  for (const key of Object.keys(properties)) {
    if (FORBIDDEN.has(key.toLowerCase())) {
      // Loud in development, dropped in production — a mis-instrumented event
      // is not worth breaking a customer's checkout over.
      if (process.env.NODE_ENV !== "production") {
        throw new Error(
          `[track] "${key}" is PII and must not be sent with "${event}".`,
        );
      }
      delete properties[key];
    }
  }
}

/**
 * Records one funnel event.
 *
 * Never throws in production and never blocks. Analytics is the least important
 * thing happening on the page; if it fails, the customer must not notice.
 */
export function track<E extends EventName>(
  event: E,
  ...args: FunnelEvents[E] extends Record<string, never>
    ? []
    : [properties: FunnelEvents[E]]
): void {
  try {
    const properties = { ...(args[0] ?? {}) } as Record<string, unknown>;
    assertNoPii(event, properties);
    vercelTrack(event, properties as Parameters<typeof vercelTrack>[1]);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[track]", event, error);
    }
  }
}

/**
 * Maps a failure to a short, stable reason string.
 *
 * Free-text reasons make `payment_failed` useless for grouping — every message
 * variant becomes its own bucket. These are the buckets worth counting.
 */
export function paymentFailureReason(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code: unknown }).code);
    if (code) return code.toLowerCase();
  }
  if (error instanceof Error && /network|fetch/i.test(error.message)) {
    return "network";
  }
  return "unknown";
}
