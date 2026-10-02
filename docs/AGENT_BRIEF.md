# Page-porting brief (shared by all page agents)

Project: **WagStays** — Next.js 16 (App Router, TS) + Tailwind **v3** + Prisma/SQLite, at
`/Users/gokhan.yildirim/hayvan-bakici-v2/wagstays`. Dev server already running at **http://localhost:3100**
(do NOT start another one, do NOT stop it). Next 16 has breaking changes vs. your training data: read the
relevant guide in `node_modules/next/dist/docs/` before using an unfamiliar API. Notably: `params` and
`searchParams` are Promises (`const { slug } = await params`), `cookies()` is async, middleware is now `proxy.ts`.

## Goal
Port ONE Stitch design screen to a production page **1:1** — same structure, Tailwind classes, colours,
spacing, icons, hover states and interactions — but with **English (Canada) copy** and **real data from the DB**.

## Inputs
- Design screenshot: `/Users/gokhan.yildirim/hayvan-bakici-v2/stitch_evcil_hayvan_bak_c_platformu 2/<screen>/screen.png`
- Original HTML: `.../<screen>/code.html`
- **Pre-converted JSX** of the same HTML (class→className, styles→objects, image URLs already rewritten to
  `/images/img-XX.jpg`): `docs/design-jsx/<screen>.jsx.txt`. Split into HEADER / MAIN / FOOTER + the original
  inline scripts at the bottom. **Start from the MAIN block** — copy it, then translate and wire data.
  Inline `on*` handlers were turned into `data-todo-on*` attributes: reimplement them with React.
- Translation rules, names, places, prices: **`docs/LOCALIZATION.md`** (mandatory — keep names/prices consistent).
- Image descriptions: `docs/design-images.json`.

## Already built (use, do not modify)
- `src/app/(site)/layout.tsx` renders `<Header/>` + page + `<Footer/>`. Your page renders only its `<main>` (copy the
  design's `<main className=...>` wrapper exactly, it includes `pt-20` for the fixed header).
- `src/lib/db.ts` (`db` Prisma client), `src/lib/session.ts` (`getCurrentUser()`), `src/lib/queries.ts`
  (`getActiveCity`, `getFeaturedSitters`, `getHomeTestimonials`, `getPlatformStats`, `parseSearchParams`,
  `toSearchQuery`, `searchSitters`, `getSitterBySlug`, `getOwnerPets`), `src/lib/pricing.ts` (`priceBooking` — use it for
  every price breakdown), `src/lib/format.ts` (`formatMoney(cents)`, `formatDistance`, `formatRating`, `timeAgo`),
  `src/lib/constants.ts` (service/size labels, fees).
- `src/components/FavoriteButton.tsx` — heart toggle (server action + optimistic UI). Use it for every favourite heart.
- `prisma/schema.prisma` + `prisma/seed.ts` — read them to know the data. Demo owner: emily@wagstays.ca / wagstays123.
- Routes: `/` home, `/sitters` search (query params per `parseSearchParams`), `/sitters/[slug]` profile,
  `/book/[slug]` checkout, `/become-a-sitter` application form, `/become-a-sitter/submitted?code=WS-XXXXX`,
  `/login`, `/signup` (both accept `?next=/path`).

## Rules
- **Do not edit** shared files: anything in `src/components/` you didn't create, `src/lib/*`, `src/app/(site)/layout.tsx`,
  `src/app/layout.tsx`, `globals.css`, `tailwind.config.ts`, `prisma/*`. If you truly need a schema/shared change,
  don't make it — describe it in your final report. Put page-specific helpers next to your page
  (e.g. `src/app/(site)/sitters/_components/…`) or in a new `src/lib/<feature>.ts` file.
- Server Components by default; small `"use client"` islands only for interactivity (counters, tabs, sliders,
  toggles, selects that recompute prices, copy buttons…). Mutations = Server Actions in `src/app/actions/<feature>.ts`
  validated with **zod v4** (`z.email()`, `z.flattenError(err)`).
- Use `next/link` for internal links and `next/image` (or plain `<img>` with an eslint-disable comment if `next/image`
  would change the layout) — layout must stay identical.
- Keep the design's Tailwind classes. The Tailwind config is the design's own config, so classes like
  `font-headline-sm text-headline-sm`, `px-margin`, `gap-space-lg`, `bg-surface-container` all work.
- Responsive: the design is desktop; make sure it also degrades cleanly at 390px (no horizontal scroll).
  Use `px-margin-mobile md:px-margin` where the design uses `px-margin` on outer containers.
- Remove dead/demo-only markup comments like `8 cols) -->`.
- Toronto is the only active city, but read city/neighbourhood names from the DB, not hard-coded logic.

## Verify before reporting
1. `npx tsc --noEmit` and `npx eslint <your files>` clean.
2. Screenshot your page and compare with the design `screen.png` side by side (Read both images):
   `node /private/tmp/claude-504/-Users-gokhan-yildirim-hayvan-bakici-v2/b2d2252e-e30f-460d-887f-3f19eaa21a3a/scratchpad/shot.js http://localhost:3100/<route> /private/tmp/claude-504/-Users-gokhan-yildirim-hayvan-bakici-v2/b2d2252e-e30f-460d-887f-3f19eaa21a3a/scratchpad/<name>.png 1440 1`
   (prefix with `LOGIN=1` to screenshot as the logged-in demo user). Also take one at width 390. Fix differences.
3. Exercise the interactions/server actions (e.g. with a small Playwright script in the scratchpad dir) and check
   the dev log at `/private/tmp/claude-504/-Users-gokhan-yildirim-hayvan-bakici-v2/b2d2252e-e30f-460d-887f-3f19eaa21a3a/scratchpad/dev.log` for errors.

## Final report (short)
Files created, what's wired to real data vs. static copy, any deviations from the design and why, anything you
needed but couldn't change (shared files / schema).
