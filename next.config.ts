import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      /*
       * Admin-uploaded product images live on Vercel Blob. Without this,
       * next/image refuses the host outright and every uploaded image 400s —
       * the static ones under /public keep working, which makes the failure
       * look like a bad upload rather than a config gap.
       */
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          /* Two years, with subdomains and preload — the values the HSTS
             preload list requires. Only ever sent over https; a browser
             ignores it on http, so it is safe on localhost. */
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          /* Stops a browser second-guessing a Content-Type. Without it an
             uploaded file served as text/plain can be sniffed as script. */
          { key: "X-Content-Type-Options", value: "nosniff" },
          /* Send the full URL same-origin, only the origin cross-origin — so a
             third party never learns which order id someone was looking at. */
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          /* Nothing here needs any of these; denying them means a compromised
             script cannot ask either. */
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

/**
 * Sentry's build-time wrapper: source map upload and the tunnel route.
 *
 * Everything here is inert without SENTRY_AUTH_TOKEN, so a local build and a
 * fork's CI run behave exactly as they did before this was added.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // The build log is long enough already; failures still print.
  silent: !process.env.CI,

  /*
   * Upload source maps, then delete them from the deployed output. Without the
   * delete they are served publicly, and a stack trace against readable source
   * hands an attacker the server logic for free.
   */
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },

  /*
   * Proxies Sentry through our own origin. Ad blockers block requests to
   * sentry.io outright, which silently drops a slice of client errors —
   * disproportionately from the privacy-conscious users most likely to hit an
   * edge case worth seeing.
   */
  tunnelRoute: "/monitoring",

  disableLogger: true,
  automaticVercelMonitors: true,
});
