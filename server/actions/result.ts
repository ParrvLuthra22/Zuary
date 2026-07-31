import "server-only";

import { isAppError, toSerialisable, type ErrorCode } from "@/shared/errors";

/**
 * The shape every server action returns.
 *
 * Actions return a result rather than throwing, because a thrown error crossing
 * the action boundary reaches the client as a redacted digest — React strips
 * the message in production on purpose, so the customer sees "An error occurred
 * in the Server Components render" instead of "That size just sold out". A
 * typed error is worth nothing if the UI cannot read it.
 *
 * So the flattening happens here: the class is lost on the wire, the `code` and
 * the safe `message` survive, and the client branches on the code.
 */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; code: ErrorCode; error: string; fields?: Record<string, string[]> };

export function ok(): ActionResult;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T) {
  return { ok: true as const, data };
}

/**
 * Turns a caught error into a failed result.
 *
 * Anything that is not an AppError is logged in full and collapses to one
 * generic message — same chokepoint as the HTTP side, same reason: a database
 * or provider error string must never reach the client.
 */
export function fail(error: unknown, context: string): ActionResult<never> {
  if (!isAppError(error)) {
    console.error(`[${context}]`, error);
  } else if (error.cause) {
    console.error(`[${context}] ${error.code}`, error.cause);
  }

  const serialised = toSerialisable(error);
  return {
    ok: false,
    code: serialised.code,
    error: serialised.message,
    ...(serialised.fields ? { fields: serialised.fields } : {}),
  };
}
