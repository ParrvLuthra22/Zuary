import * as Sentry from "@sentry/nextjs";

/**
 * Runtime-aware Sentry bootstrap.
 *
 * Next runs this once per runtime, and the two configs cannot be merged: the
 * edge bundle has no Node built-ins, so importing the server config there fails
 * at build time rather than at runtime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Errors thrown while rendering a route.
 *
 * Without this, a failure inside a server component or a route handler is
 * caught by Next's own boundary and never reaches Sentry — which is the exact
 * class of error worth knowing about.
 */
export const onRequestError = Sentry.captureRequestError;
