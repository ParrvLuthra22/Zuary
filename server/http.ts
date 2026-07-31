import "server-only";

import { NextResponse } from "next/server";
import type { z } from "zod";

import type { LimitName } from "@/server/services/rate-limit.service";

import {
  ValidationError,
  isAppError,
  toHttpStatus,
  toSerialisable,
} from "@/shared/errors";

/**
 * The adapter between services and HTTP.
 *
 * Services throw typed errors and know nothing about Response; this is the one
 * place that turns them into status codes. Keeping it here is what lets a route
 * handler stay at four or five statements — parse, guard, call, respond — with
 * no error ladder in the middle of it.
 */

/** Parses a JSON body, raising ValidationError rather than returning a union. */
export async function parseJson<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    throw new ValidationError("Malformed request.", { cause: error });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Check the highlighted fields.",
      { fields: flat.fieldErrors as Record<string, string[]> },
    );
  }
  return parsed.data;
}

/** Same, for a value that is already in hand (a server action's argument). */
export function parseInput<S extends z.ZodTypeAny>(
  schema: S,
  input: unknown,
): z.infer<S> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Check the highlighted fields.",
      { fields: flat.fieldErrors as Record<string, string[]> },
    );
  }
  return parsed.data;
}

/**
 * Maps a thrown error to a JSON response.
 *
 * An AppError carries a status and a message written for a customer. Anything
 * else is a bug, a driver fault or a provider outage — logged in full here,
 * answered with a generic 500. The distinction is the whole point: this is the
 * chokepoint that stops a Postgres constraint name or a Razorpay internal
 * string reaching the browser.
 */
export function errorResponse(error: unknown, context: string) {
  if (!isAppError(error)) {
    console.error(`[${context}]`, error);
  } else if (error.cause) {
    // A typed error with a cause is still worth logging — the safe message went
    // to the customer, the real reason belongs in the log.
    console.error(`[${context}] ${error.code}`, error.cause);
  }

  return NextResponse.json(toSerialisable(error), {
    status: toHttpStatus(error),
  });
}

/**
 * Applies a rate-limit bucket, returning a 429 response when it trips.
 *
 * Returns a Response or null rather than throwing, because a 429 needs a
 * Retry-After header and AppError has nowhere to carry one. Callers do
 * `const limited = await limit(...); if (limited) return limited;`.
 */
export async function limit(
  bucket: LimitName,
  key: string,
  message: string,
): Promise<Response | null> {
  const { rateLimit } = await import("@/server/services/rate-limit.service");
  const result = await rateLimit(bucket, key);
  if (!result.limited) return null;

  return NextResponse.json(
    { code: "VALIDATION", message },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSec) },
    },
  );
}

/**
 * Wraps a handler so every thrown error becomes a response.
 *
 * `context` is the log prefix — pass the route path.
 */
export function route<Args extends unknown[]>(
  context: string,
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorResponse(error, context);
    }
  };
}
