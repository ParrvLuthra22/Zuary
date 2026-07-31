/**
 * The error taxonomy shared by every layer.
 *
 * Services throw these. Route handlers map them to status codes. Server actions
 * flatten them into `{ ok: false, code, message }`. The UI reads `message`.
 *
 * Lives in /shared rather than /server because the client needs the `code`
 * union to branch on — "did that fail because I am signed out, or because it
 * sold out?" — and a client that imports the codes from the same file the
 * server throws from cannot drift from it.
 *
 * Note on `instanceof`: it works on the server, and across an API route
 * boundary the class is gone by the time the browser sees JSON. That is why
 * every error carries a string `code` as well. Client code branches on the
 * code; only server code uses instanceof.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: `message` is safe to show a stranger.
 * A Postgres error, a Razorpay error string, a stack trace or a constraint name
 * must never reach `message`. Put the real cause in `cause`, which is logged
 * server-side and never serialised.
 */

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "OUT_OF_STOCK"
  | "PAYMENT"
  /**
   * Not one of the six thrown by services — this is what anything unrecognised
   * collapses to on its way out. It exists so the generic 500 does not have to
   * masquerade as a validation failure, which would tell the UI to highlight
   * fields that are perfectly fine.
   */
  | "INTERNAL";

/** Fields safe to put on the wire. Deliberately does not include `cause`. */
export type SerialisedError = {
  code: ErrorCode;
  message: string;
  /** Per-field messages, for a form to render inline. Validation only. */
  fields?: Record<string, string[]>;
};

export abstract class AppError extends Error {
  abstract readonly code: ErrorCode;
  /** What an HTTP handler should answer with. */
  abstract readonly status: number;

  /**
   * `message` is the user-facing string, not a developer one. Anything a
   * customer should not read belongs in `cause`.
   */
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
    // Restores the prototype chain so instanceof survives the ES5 downlevel
    // target this project compiles to. Without it every check silently fails.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): SerialisedError {
    return { code: this.code, message: this.message };
  }
}

/** Not signed in. The caller should be sent to /login. */
export class UnauthorizedError extends AppError {
  readonly code = "UNAUTHORIZED" as const;
  readonly status = 401;
  constructor(message = "Sign in to continue.", options?: { cause?: unknown }) {
    super(message, options);
  }
}

/**
 * Signed in, but not allowed.
 *
 * Note that /admin routes deliberately answer 404 rather than 403 — a 403
 * confirms the route exists. That mapping is the route handler's job, not this
 * class's; see toHttpStatus and the admin middleware.
 */
export class ForbiddenError extends AppError {
  readonly code = "FORBIDDEN" as const;
  readonly status = 403;
  constructor(
    message = "You do not have access to that.",
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}

/**
 * No such thing — or none you are allowed to see.
 *
 * Services throw this for "belongs to another user" as well as "does not
 * exist", on purpose: distinguishing them tells a prober which ids are real.
 */
export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND" as const;
  readonly status = 404;
  constructor(message = "Not found.", options?: { cause?: unknown }) {
    super(message, options);
  }
}

/** Input the server refuses. Carries per-field messages when it has them. */
export class ValidationError extends AppError {
  readonly code = "VALIDATION" as const;
  readonly status = 422;
  readonly fields?: Record<string, string[]>;

  constructor(
    message = "Check the highlighted fields.",
    options?: { cause?: unknown; fields?: Record<string, string[]> },
  ) {
    super(message, options);
    this.fields = options?.fields;
  }

  override toJSON(): SerialisedError {
    return { code: this.code, message: this.message, fields: this.fields };
  }
}

/**
 * Not enough stock. 409, not 422 — the request was well-formed, the world
 * changed underneath it, and retrying unchanged will not help.
 */
export class OutOfStockError extends AppError {
  readonly code = "OUT_OF_STOCK" as const;
  readonly status = 409;
  constructor(
    message = "That size just sold out.",
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}

/**
 * The payment provider refused, or its signature did not verify.
 *
 * 402 rather than 400: a bad signature is not a malformed request, it is a
 * payment that cannot be trusted. The message never repeats what Razorpay said
 * — their strings leak internal state and are written for developers.
 */
export class PaymentError extends AppError {
  readonly code = "PAYMENT" as const;
  readonly status = 402;
  constructor(
    message = "That payment could not be confirmed.",
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}

/**
 * Narrows unknown to AppError.
 *
 * Prefer this to a bare instanceof at call sites: it reads better in a catch,
 * and it is the single place to adjust if these ever cross a realm boundary
 * where instanceof stops being reliable.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * The one function that decides what a stranger is told.
 *
 * Anything that is not an AppError is a bug, a driver fault or a provider
 * outage — none of which have a safe message — so they all collapse to one
 * generic 500. The real error goes to the caller to log; it never comes back
 * here.
 */
export function toSerialisable(error: unknown): SerialisedError {
  if (isAppError(error)) return error.toJSON();
  return {
    code: "INTERNAL",
    message: "Something went wrong. Try again.",
  };
}

/** Status for an AppError; 500 for anything unrecognised. */
export function toHttpStatus(error: unknown): number {
  return isAppError(error) ? error.status : 500;
}
