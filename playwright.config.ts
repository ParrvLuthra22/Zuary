import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3210);
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * These specs need a real database. They drive the actual checkout, so there is
 * nothing meaningful to assert against a stubbed one — the whole point is that
 * price, stock and session all agree end to end.
 *
 * Before running: set DATABASE_URL and AUTH_SECRET, then `npm run db:push &&
 * npm run db:seed && npm run seed:e2e`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // A .only left in a spec passes locally and silently skips everything in CI.
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: {
    /*
     * A production build, not `next dev`. Middleware, caching and the
     * server/client boundary all behave differently under dev, and it is the
     * production behaviour that is worth asserting.
     *
     * AUTH_URL is pinned to the test origin. .env commits a production value
     * with AUTH_TRUST_HOST, which makes Auth.js normalise req.nextUrl to the
     * live host — middleware would then redirect off-origin and every gated
     * test would follow a link to the real site.
     */
    command: `npm run build && npx next start -p ${PORT}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      AUTH_URL: baseURL,
      NEXT_PUBLIC_SITE_URL: baseURL,
    },
  },
});
