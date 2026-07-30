/**
 * The customer-facing order number.
 *
 * The id is a uuid, which nobody can read out over the phone. The first eight
 * hex characters are what the account pages, the emails, support and the admin
 * table all quote — the full uuid stays the key everywhere internal.
 *
 * Deliberately dependency-free and in its own module. It used to live beside the
 * email senders, and every client component that needed an order number pulled
 * all five React Email templates and the Resend SDK into the browser bundle with
 * it — 224 kB on /admin/orders alone.
 */
export const shortOrderId = (id: string) =>
  id.replace(/-/g, "").slice(0, 8).toUpperCase();
