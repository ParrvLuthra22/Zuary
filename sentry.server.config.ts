import * as Sentry from "@sentry/nextjs";

import { isMoneyRoute, scrub, scrubUrl } from "@/shared/observability/scrub";

const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  /*
   * 10% in production, everything in development.
   *
   * Full tracing in production on a checkout that sees real volume is both
   * expensive and useless — the interesting traces are the failures, and those
   * arrive through error events regardless of the sample rate.
   */
  tracesSampleRate: isProduction ? 0.1 : 1.0,

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Never send a request body. Ours carry addresses and phone numbers.
  sendDefaultPii: false,
  maxValueLength: 8192,

  // Without a DSN this is a no-op, which is what we want locally and in CI.
  enabled: Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),

  /**
   * The last thing that runs before an event leaves the process.
   *
   * Everything is scrubbed, including fields Sentry populated itself — the
   * point is that no path exists from a customer's details to a third party,
   * not that we remembered to redact the fields we happened to think of.
   */
  beforeSend(event) {
    const path = scrubUrl(event.request?.url);

    if (event.request) {
      event.request.url = path;
      delete event.request.data;
      delete event.request.cookies;
      delete event.request.headers;
      delete event.request.query_string;
    }

    // Identify the session, never the person. A user id is ours and means
    // nothing outside our database; an email is the customer.
    if (event.user) {
      event.user = { id: event.user.id };
    }

    event.tags = {
      ...event.tags,
      route: path ?? "unknown",
      /*
       * The tag the alert rule fires on. Anything thrown inside
       * /api/checkout/* or /api/webhooks/* has either taken money without
       * recording it or recorded it without taking it, and both need a human
       * tonight rather than in the morning.
       */
      ...(isMoneyRoute(path) ? { money_path: "true" } : {}),
    };

    return scrub(event);
  },

  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.data?.url) {
      breadcrumb.data.url = scrubUrl(String(breadcrumb.data.url));
    }
    return scrub(breadcrumb);
  },
});
