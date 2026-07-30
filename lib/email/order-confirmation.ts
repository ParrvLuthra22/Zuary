/**
 * Order confirmation email.
 *
 * STUB — B05 builds the real thing (template, Resend send, retry). This exists
 * so the settle path already calls it and B05 only has to fill in the body,
 * rather than hunting for the right hook afterwards.
 *
 * TODO(B05): render the order template and send via Resend. Keep the contract:
 * never throw, and never block settlement.
 */
export async function sendOrderConfirmation(orderId: string): Promise<void> {
  // Deliberately swallow everything. A failed email must never turn a paid
  // order into an error response — the customer has been charged, and the
  // order is already settled by the time this runs.
  try {
    if (process.env.NODE_ENV !== "production") {
      console.info("[email] order confirmation queued (stub)", orderId);
    }
    // await resend.emails.send(...)
  } catch (error) {
    console.error("[email] order confirmation failed", orderId, error);
  }
}
