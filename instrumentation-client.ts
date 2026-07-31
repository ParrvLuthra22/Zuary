import * as Sentry from "@sentry/nextjs";

import { scrub, scrubUrl } from "@/shared/observability/scrub";

/**
 * Browser-side Sentry.
 *
 * The DSN here is public by necessity — it ships in the bundle — which is
 * precisely why the scrubbing matters more on this side, not less. A DSN only
 * lets someone send us events; what must not happen is us sending out a
 * customer's details from a form they were halfway through filling in.
 *
 * No Session Replay and no browser tracing integration. Replay records the DOM,
 * and this app's DOM contains an address form. Masking it correctly is a
 * standing obligation nobody would remember to re-check after a redesign, so
 * the honest answer is not to record it at all.
 */
const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: isProduction ? 0.1 : 1.0,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  sendDefaultPii: false,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

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
    event.tags = { ...event.tags, route: path ?? "unknown" };
    return scrub(event);
  },

  beforeBreadcrumb(breadcrumb) {
    /*
     * Drop the breadcrumbs that record what someone typed. Sentry's `ui.input`
     * crumb does not carry the value, but the selector it carries is enough to
     * reconstruct which field, and paired with a console crumb it has leaked
     * values before.
     */
    if (breadcrumb.category === "ui.input") return null;
    if (breadcrumb.data?.url) {
      breadcrumb.data.url = scrubUrl(String(breadcrumb.data.url));
    }
    return scrub(breadcrumb);
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
