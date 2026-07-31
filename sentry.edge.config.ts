import * as Sentry from "@sentry/nextjs";

import { scrub, scrubUrl } from "@/shared/observability/scrub";

/**
 * The edge runtime — middleware, and anything with `runtime = "edge"`.
 *
 * Kept deliberately small. This bundle is evaluated on every matched request,
 * so it imports the scrubber (which is framework-free and has no dependencies)
 * and nothing else.
 */
const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: isProduction ? 0.1 : 1.0,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  sendDefaultPii: false,
  enabled: Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),

  beforeSend(event) {
    const path = scrubUrl(event.request?.url);
    if (event.request) {
      event.request.url = path;
      delete event.request.data;
      delete event.request.cookies;
      delete event.request.headers;
      delete event.request.query_string;
    }
    if (event.user) event.user = { id: event.user.id };
    event.tags = { ...event.tags, route: path ?? "unknown", runtime: "edge" };
    return scrub(event);
  },
});
