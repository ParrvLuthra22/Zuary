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

The site runs at http://localhost:3000. Everything except checkout, stock and
the waitlist works without a database.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Write a SQL migration to `./drizzle` from the schema |
| `npm run db:push` | Push the schema straight to the database |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | Upsert the 3 products and 12 variants at stock 25 |

## Environment

Six variables, all listed in `.env.example`.

| Variable | Where it comes from | What breaks without it |
| --- | --- | --- |
| `DATABASE_URL` | Neon → project → connection string (pooled) | Checkout, stock, order pages, waitlist, every `db:*` script |
| `RAZORPAY_KEY_ID` | Razorpay Dashboard → Settings → API Keys | Creating a Razorpay order |
| `RAZORPAY_KEY_SECRET` | Same screen, shown once at generation | Creating orders, verifying the payment signature |
| `RAZORPAY_WEBHOOK_SECRET` | Dashboard → Settings → Webhooks. **Not** the API secret | Every webhook is rejected |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same value as `RAZORPAY_KEY_ID` | Fallback only; checkout normally takes the key id from the server |
| `NEXT_PUBLIC_SITE_URL` | Your origin, e.g. `https://zuary.in` | Canonicals, OG URLs and the sitemap fall back to localhost |

Only the two `NEXT_PUBLIC_*` values reach the browser. Never put a secret behind
that prefix.

---

# Running the shop

## Changing a price

Prices live in **two** places and both must move together.

1. Edit `price` in `lib/data/products.ts`. This is what the site displays.
2. Run `npm run db:seed`. This upserts `products.price_inr`, which is what
   checkout actually charges.

`create-order` reprices every line from the **database**, never from the
browser and never from the catalogue file. If you change step 1 and skip step 2,
the shop will advertise one price and charge another. The cart's server
validation will also start reporting `price-changed` on every line.

Prices are integer rupees. Razorpay is handed paise (`toPaise`).

## Adding product photos

Files go in `public/products/<slug>/` named `01.webp` … `06.webp`:

```
public/products/kohl/01.webp   ← front, used for cards, OG and fly-to-cart
public/products/kohl/02.webp   ← the hover swap on shop cards
public/products/kohl/03.webp … 06.webp
```

- **Ratio 4:5**, at least 1600×2000. Every frame on the site is 4:5 except the
  drop page, which cover-crops.
- The paths are listed in `images` in `lib/data/products.ts`. Add or remove
  entries there if a product has a different number of shots.
- Anything missing falls back to the product's `swatch` colour rather than a
  broken-image icon. That is why the site looks complete with an empty
  `public/` — and why Lighthouse currently logs 400s for images.

Other image paths:

| Path | Used by |
| --- | --- |
| `public/lookbook/the-trouser-trio/01–10.webp` | `/lookbook` stack and grid, drop page grid |
| `public/material/weave.webp`, `tag.webp`, `hem.webp` | Homepage material section, drop chapter 5 |
| `public/material/mill.webp` | About essay breakout, PDP fabric band |
| `public/sequence/hero/0001.webp …` | Homepage hero, sequence mode |

## Shooting and adding a hero sequence

The homepage hero can run as a scrubbed image sequence instead of a crossfade.

**Shooting.** Lock the camera, rotate the garment (or dolly) through the move,
and export one frame per step. 48 frames over a 250% scroll is the tuned
default — fewer reads as steppy, more costs bandwidth for no gain.

**Exporting.** Frames go in `public/sequence/hero/`, zero-padded from `0001.webp`:

```
public/sequence/hero/0001.webp
public/sequence/hero/0002.webp
…
public/sequence/hero/0048.webp
```

- 16:9, 1600×900 is plenty — it is drawn to a canvas, not zoomed.
- **Budget 3 MB for the whole sequence.** At 48 frames that is ~60 KB each.
  WebP quality 65–70 gets there.

**Switching it on.** In `app/(store)/page.tsx`:

```tsx
<HeroScrub mode="sequence" frames={48} basePath="/sequence/hero"
           fallbackImages={kohl?.images ?? []} />
```

`fallbackImages[0]` is still used as the static frame on mobile and under
reduced motion — **the sequence is never downloaded on either**, which is the
point of the 3 MB budget being desktop-only.

The loader shows a progress rule and holds the section until 80% of frames have
arrived. If most frames 404 it gives up and shows the section anyway rather
than hanging.

## Switching the active drop

`lib/data/drops.ts` holds the drops. The site reads the live one through
`currentDrop`, which is the first entry with `status: "live"`.

To ship a new drop:

1. Add an entry to `DROPS` with a new `slug`, `season`, `releasedAt`, `intro`,
   the `products` it contains, and its `lookbookImages`.
2. Set the previous drop's `status` to `"archived"` and the new one to
   `"live"`. Only one should be `"live"`.
3. Add the lookbook files under `public/lookbook/<slug>/`.

`generateStaticParams` picks up new slugs automatically, as do the sitemap and
`/drops`. Note `dynamicParams = false` on the drop, product and policy routes:
a slug that is not in the data returns a real 404 rather than a soft one.

`lookbookImages` carries `span` (`full` / `half` / `third`) for the drop page's
12-column grid and a `caption` plus optional `product` for the lookbook.

---

## Design tokens

`app/globals.css` is the single source of truth. Our tokens are declared first,
then shadcn's variables are mapped onto them, so shadcn components inherit the
theme with no per-component overrides.

- **Palette** — carbon, graphite, slate, steel, fog, off-white, paper, plus
  hazard / hazard-soft / hazard-deep.
- **Semantic** — `--bg`, `--bg-deep`, `--bg-raised`, `--fg`, `--fg-muted`,
  `--line`, `--accent`, `--accent-ink`.
- **Type** — `.t-display-xl/lg/md/sm`, `.t-label`, `.t-deva`.
- **Motion** — `--ease-out/-in-out/-snap` and `--dur-micro`…`--dur-page`,
  mirrored in `lib/motion/easing.ts` for Framer.

Theming runs off `data-theme` on `<html>`, not a class. Dark is the default; a
first visit follows `prefers-color-scheme`, then the choice is persisted. An
inline script in `ThemeProvider` applies it before first paint.

Four things worth knowing before extending this:

- **`--accent` is for fills, `--accent-ink` is for text.** The brand orange is
  5.9:1 on graphite and fine as body text in the dark theme, but only 2.7:1 on
  the light theme's paper — failing AA even for large text. `--accent-ink`
  darkens to `#B8431A` in light mode. Use `text-accent-ink`, never
  `text-accent`.
- **The font variables must stay on `<html>`.** `:root` aliases them
  (`--font-display: var(--font-inter-tight)`), and a custom property that
  references an undefined one computes to invalid and inherits down — putting
  them on `<body>` silently drops every typeface to serif.
- **Keep the cursor rules inside `@layer base`.** Unlayered CSS beats every
  layer regardless of specificity, which silently kills `cursor-*` utilities
  everywhere.
- **Tailwind v4 puts `translate`, `scale` and `rotate` on their own CSS
  properties**, not `transform`. Reading `getComputedStyle(el).transform` to
  check a Tailwind translate will always look like nothing happened.

## Checkout

1. `POST /api/checkout/create-order` — validates, **reprices every line from the
   database**, checks stock, creates the Razorpay order, writes an `orders` row
   as `created`. The zod schema drops price fields entirely, so a
   client-supplied amount is not merely ignored but unreadable.
2. Razorpay Checkout opens in the browser.
3. `POST /api/checkout/verify` — HMACs `<order_id>|<payment_id>`, then settles.
4. `POST /api/webhooks/razorpay` — the same settlement from Razorpay's side,
   using the raw body and the webhook secret.

Both paths share `settleOrderPaid`, which flips the order and decrements stock
in one transaction, idempotent on whichever arrives first. The decrement carries
a `stock >= qty` guard so overselling is impossible even under weak isolation.

The database driver is the pooled `neon-serverless` one, **not** `neon-http`:
the HTTP driver is stateless and has no `db.transaction()`, so settling a
payment atomically is not expressible on it.

---

## Deploying

1. Push to GitHub.
2. Import the repo in Vercel.
3. Add all six env vars (above) in Vercel → Settings → Environment Variables.
   `NEXT_PUBLIC_SITE_URL` must be the real origin or canonicals and the sitemap
   will point at localhost.
4. Against the production Neon branch: `npm run db:push && npm run db:seed`.
5. Razorpay Dashboard → Settings → Webhooks → add
   `https://<domain>/api/webhooks/razorpay` for `payment.captured` and
   `payment.failed`. Copy the signing secret into `RAZORPAY_WEBHOOK_SECRET`.
6. Do a full test-mode purchase on the deployed URL before touching live keys.
7. Only then swap to live Razorpay keys.

## Known gaps

- `public/` ships empty. Every image falls back to a swatch, and Lighthouse logs
  a 400 per missing image, which is the only thing keeping Best Practices off
  100.
- Nothing has been exercised against a real database or Razorpay account.
- The homepage/PDP Lighthouse performance sits at 82–85 on simulated mobile. The
  cost is four font families; dropping Eczar from the homepage would clear it.
- OG images render in Satori's default face, not Inter Tight — that needs a font
  file bundled in the repo. They are deliberately ASCII-only, because the rupee
  sign made Satori fetch a font at build time and that failed intermittently.
- `components/sections/StackGallery.tsx` is unused.
