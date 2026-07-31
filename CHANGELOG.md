# Changelog

What shipped, and when. The point of this file is the day a customer says "it
broke on Tuesday" — dates and behaviour changes matter more than commit hashes.

Newest first. Dates are the day the change landed on `master`.

## Unreleased

### Added
- End-to-end tests (Playwright): critical purchase path, auth boundaries, admin
  flows. The critical-path spec asserts the cart survives a sign-in round trip,
  which is the failure most likely to appear silently and cost orders.
- Unit tests (Vitest) for the money logic: shipping thresholds, order totals,
  stock guards, signature rejection, webhook idempotency. 67 tests.
- Sentry on all three runtimes, with PII scrubbed before send — keys, patterns
  and free text alike. Errors in `/api/checkout/*` and `/api/webhooks/*` are
  tagged `money_path` and carry the order and Razorpay ids.
- Vercel Analytics and Speed Insights, plus an eleven-event funnel behind one
  typed helper (`client/lib/track.ts`) that refuses PII at runtime as well as
  in the types.
- `scripts/backup-db.ts` — weekly JSON dump of orders, order items, users and
  addresses, with a manifest. Exits non-zero on a zero-order dump.
- GitHub Actions CI: typecheck, lint, unit tests and build on every push; e2e
  where a test database is configured.

### Fixed
- The PII scrubber missed a phone number written as `+919876543210` — `\b`
  never matches between two digits, so the country code defeated the word
  boundary. Found by the test written for that case.

## 2026-07-31 — R02: service layer

### Changed
- Business logic moved out of route handlers and server actions into
  `/server/services`. Handlers are now validate → guard → call → map → revalidate.
  No handler body exceeds 19 lines and nothing under `app/` touches the database.
- Typed errors (`shared/errors.ts`). Services throw, handlers map to status
  codes, actions flatten to `{ ok, code, error }`. A database or provider error
  string can no longer reach the browser.
- `requireUser` / `requireAdmin` in `server/auth/guards.ts`. Every server action
  opens with one, except `validateCartAction` — the cart is public and requiring
  a session there would break it for signed-out visitors.
- **Audit rows now write inside the caller's transaction.** A logging failure
  can therefore block an admin action. Deliberate: an audit log with silent gaps
  cannot be used as evidence, and nobody can tell which rows are missing.

### Fixed
- `NavBar` was a server component filed under `/client`; moved to
  `/server/components`, removing its ESLint exemption.
- `.env.example` now warns that `AUTH_URL` with `AUTH_TRUST_HOST` makes a local
  production build proxy the live host from middleware — which made `/admin`
  answer 200 with a parked-domain page instead of 404.

## 2026-07-31 — R01: layered directories

### Changed
- Reorganised into `/server`, `/client`, `/shared`. `lib/` removed; 148 files
  had imports rewritten.
- `server-only` / `client-only` guards, with two documented exemptions:
  `auth/edge-config.ts` (bundled for the edge) and `db/schema.ts` (loaded by
  drizzle-kit and tsx, which do not set the `react-server` condition).
- Dropped the `@/*` catch-all from tsconfig so a wrong import fails loudly.
- ESLint forbids `/client` importing `/server`, allowing type-only imports and
  server actions.

### Fixed
- `drizzle.config.ts` still pointed at the deleted `lib/db/schema.ts`.

## Earlier

Commits `dbfe6e4`..`3cf92d8` — B01 through B08: Auth.js, account area, checkout
with auth, transactional email, admin orders and catalogue, phone OTP and
hardening. Before that, P01–P13 and the photography passes built the storefront.

---

### Operational note

Verification of the payment flow end to end has never been possible in this
repository: `DATABASE_URL` has never been set, the seven migrations in
`/drizzle` are unapplied, and no seed has run. Anything above describing
checkout behaviour is verified by unit test and by reading, not by a completed
purchase.
