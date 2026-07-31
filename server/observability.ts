import "server-only";

import * as Sentry from "@sentry/nextjs";

import { isAppError } from "@/shared/errors";

/**
 * Context capture for the operations that move money.
 *
 * When checkout breaks at 2am you need to know which order, not just that
 * something threw. Sentry groups by stack trace, so ten failed orders collapse
 * into one issue — without the ids attached, that issue tells you a payment
 * path is broken and nothing about whose payment.
 */

export type PaymentContext = {
  orderId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  /** Rupees. Useful for triage: a single ₹99 failure is not a ₹40,000 one. */
  totalInr?: number;
};

/**
 * Runs an operation with payment identifiers attached to anything it throws.
 *
 * Re-throws, always. This is a reporting decorator and must not change control
 * flow — the caller's error handling is what decides whether the customer sees
 * a refusal or a retry.
 *
 * Expected refusals are recorded but not reported: a customer whose card was
 * declined, or whose cart sold out mid-checkout, is the system working. Paging
 * someone for those trains them to ignore the alerts that matter. The
 * exceptions are OUT_OF_STOCK after a successful payment — money has moved and
 * the stock was not there — and anything untyped, which is a real bug.
 */
export async function withPaymentContext<T>(
  operation: string,
  context: PaymentContext,
  run: () => Promise<T>,
): Promise<T> {
  return Sentry.withScope(async (scope) => {
    scope.setTag("operation", operation);
    scope.setTag("money_path", "true");
    // Ids only — no email, no phone, no address. The order id is ours and
    // resolves to a customer only through our own database.
    scope.setContext("payment", {
      orderId: context.orderId ?? null,
      razorpayOrderId: context.razorpayOrderId ?? null,
      razorpayPaymentId: context.razorpayPaymentId ?? null,
      totalInr: context.totalInr ?? null,
    });
    if (context.orderId) scope.setTag("order_id", context.orderId);

    try {
      return await run();
    } catch (error) {
      if (shouldReport(error)) {
        Sentry.captureException(error, { level: "error" });
      } else {
        Sentry.addBreadcrumb({
          category: "payment",
          level: "info",
          message: `${operation} refused: ${
            isAppError(error) ? error.code : "unknown"
          }`,
        });
      }
      throw error;
    }
  });
}

/**
 * An expected refusal is not an incident.
 *
 * OUT_OF_STOCK is the one typed error that still pages: reaching it means the
 * settle transaction rolled back after Razorpay captured, so the customer has
 * paid for something we cannot ship. That needs a human the same day.
 */
function shouldReport(error: unknown): boolean {
  if (!isAppError(error)) return true;
  return error.code === "OUT_OF_STOCK" || error.code === "INTERNAL";
}

/** Attaches the current route to any event raised inside `run`. */
export function withRoute<T>(route: string, run: () => Promise<T>): Promise<T> {
  return Sentry.withScope((scope) => {
    scope.setTag("route", route);
    return run();
  });
}
