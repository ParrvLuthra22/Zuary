# ZUARY

Storefront for ZUARY — Indian trousers cut in fixed runs.

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Drizzle + Neon Postgres ·
Razorpay · Framer Motion / GSAP / Lenis · deployed on Vercel.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

The site runs at http://localhost:3000. Everything except checkout and the
waitlist works without a database.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Write a SQL migration to `./drizzle` from the schema |
| `npm run db:push` | Push the schema straight to the database (dev only) |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | Upsert the 3 products and 12 variants at stock 25 |

The `db:*` scripts need a reachable `DATABASE_URL`. Nothing has been pushed yet —
the schema compiles, but no migration has been run.

## Environment

Six variables, all listed in `.env.example`.

| Variable | Where it comes from | What breaks without it |
| --- | --- | --- |
| `DATABASE_URL` | Neon → project → connection string (pooled) | Checkout, order pages, waitlist, every `db:*` script |
| `RAZORPAY_KEY_ID` | Razorpay Dashboard → Settings → API Keys | Creating a Razorpay order |
| `RAZORPAY_KEY_SECRET` | Same screen, shown once at generation | Creating orders, and verifying the payment signature |
| `RAZORPAY_WEBHOOK_SECRET` | Dashboard → Settings → Webhooks. **Not** the API secret | Webhook signature check — every webhook is rejected |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same value as `RAZORPAY_KEY_ID` | Fallback only; checkout normally takes the key id from the server response |
| `NEXT_PUBLIC_SITE_URL` | Your own origin, e.g. `https://zuary.in` | Absolute URLs in metadata (falls back to localhost) |

Only the two `NEXT_PUBLIC_*` values reach the browser. Never put a secret behind
that prefix.

## Layout

```
app/
  (store)/       /, /shop, /products, /products/[slug], /lookbook,
                 /about, /cart, /checkout, /orders, /orders/[id]
  (cinematic)/   /drops — full-bleed, no footer
  api/           checkout/create-order, checkout/verify,
                 webhooks/razorpay, waitlist
components/
  ui/            shadcn primitives, themed through our tokens
  motion/        TrouserCursor, PageTransition, RevealText, Magnetic, SmoothScroll
  sections/      HeroScrub, ProductRail, MaskedScrollSection, Marquee, StackGallery
  commerce/      ProductCard, ProductImage, SizeSelector, AddToCart, CartSheet, CheckoutForm
  layout/        Nav, Footer, ThemeProvider
lib/
  data/          products, drops, team, policies — the catalogue lives here
  db/            schema, client, queries
  razorpay/      client, signature verification
  motion/        easing, variants
  checkout.ts    shared zod schemas + server-side pricing
stores/          cart, theme, ui (zustand + persist)
```

## Design tokens

`app/globals.css` is the single source of truth. Our tokens are declared first,
then shadcn's variables are mapped onto them, so shadcn components inherit the
theme with no per-component overrides.

- **Palette** — carbon, graphite, slate, steel, fog, off-white, paper, plus
  hazard / hazard-soft / hazard-deep.
- **Semantic** — `--bg`, `--bg-deep`, `--bg-raised`, `--fg`, `--fg-muted`,
  `--line`, `--accent`. Exposed to Tailwind as `bg-bg-raised`, `text-fg-muted`,
  `border-line`, `text-accent`, and so on.
- **Type** — `.t-display-xl/lg/md/sm`, `.t-label`, `.t-deva`.
- **Motion** — `--ease-out/-in-out/-snap` and `--dur-micro`…`--dur-page`,
  mirrored in `lib/motion/easing.ts` for Framer.

Theming runs off `data-theme` on `<html>`, not a class. Dark is the default; a
first visit follows `prefers-color-scheme`, and the choice is persisted after
that. An inline script in `ThemeProvider` applies it before first paint.

Two things worth knowing before extending this:

- **The font variables must stay on `<html>`.** `:root` aliases them
  (`--font-display: var(--font-inter-tight)`), and a custom property that
  references an undefined one computes to invalid and inherits down — putting
  them on `<body>` silently drops every typeface to serif.
- **`--accent` is hazard orange**, which is also the variable shadcn reads for
  `bg-accent`. None of the installed components use it. If you add a shadcn
  component that uses accent as a hover fill, give it `bg-bg-raised` instead.

## Checkout

1. `POST /api/checkout/create-order` — validates the payload, **reprices the
   cart from `lib/data/products.ts`**, checks variant stock, creates the
   Razorpay order, and writes an `orders` row with status `created`.
2. Razorpay Checkout opens in the browser.
3. `POST /api/checkout/verify` — HMACs `<order_id>|<payment_id>` against the API
   secret, flips the order to `paid`, and decrements stock.
4. `POST /api/webhooks/razorpay` — the same settlement from Razorpay's side,
   using the raw request body and the webhook secret. Both paths are idempotent:
   whichever lands first wins, the second is a no-op.

The browser only ever sends `slug`, `size`, and `qty`. Prices are never taken
from the client.

## Not done yet

- `public/products`, `public/sequence`, `public/lookbook`, and `public/material`
  are empty. Product images fall back to the product's swatch colour, and
  `HeroScrub` draws an empty canvas until frames exist at
  `/sequence/trouser/0001.webp`…
- No migration has been run; `db:generate` / `db:push` still need a database.
- `/orders` has no lookup — only the direct `/orders/[id]` link works.
- No order confirmation email.
