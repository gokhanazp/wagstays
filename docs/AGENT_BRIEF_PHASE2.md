# Phase 2 brief — admin panel, dashboards, messaging (shared by all agents)

Project: **WagStays** at `/Users/gokhan.yildirim/hayvan-bakici-v2/wagstays` — Next.js 16 App Router + TS, Tailwind **v3**
(design-system tokens in `tailwind.config.ts`), Prisma + SQLite. Dev server is already running at
**http://localhost:3100** — don't start/stop it. Next 16 differs from your training data: check
`node_modules/next/dist/docs/` before using an unfamiliar API (`params`/`searchParams` are Promises, `cookies()`
and `headers()` are async, middleware is `src/proxy.ts`). Zod is v4 (`z.email()`, `z.flattenError(err)`).

Read first: `README.md`, `prisma/schema.prisma`, `prisma/seed.ts`, `docs/LOCALIZATION.md` (copy is English-Canada,
CAD, Toronto, Canadian spelling), and skim one finished page (e.g. `src/app/(site)/book/[slug]/page.tsx`).

## There is no Stitch design for these screens
Build them in the **same design language** as the rest of the site (Warm Paw Companion — see
`/Users/gokhan.yildirim/hayvan-bakici-v2/stitch_evcil_hayvan_bak_c_platformu 2/warm_paw_companion/DESIGN.md`):
vanilla canvas, white cards with 16px radius + hairline `#EFE7DE` border + soft cocoa shadow, pill buttons (coral
primary CTA, sage secondary), Plus Jakarta Sans token classes (`font-title-md text-title-md`, `font-body-sm text-body-sm`…),
Material Symbols Outlined icons, generous spacing (`gap-space-lg`, `p-space-lg`). No new colours, no other UI libraries.

**Use the shared kit** `src/components/ui.tsx`: `PageHeader`, `Card`, `CardHeader`, `StatCard`, `StatusChip` (tones),
`EmptyState`, `Table` + `TH`/`TD`, `BTN.*` button classes, `INPUT`/`TEXTAREA`/`SELECT`/`LABEL`, `Field`, `Toggle`,
`Pager`, `formatDate`/`formatDateTime`. Status labels/tones: `BOOKING_STATUS_LABELS`, `APPLICATION_STATUS_LABELS` in
`src/lib/constants.ts`.

## Already built (use, do not modify unless your task says so)
- Layouts: `src/app/admin/layout.tsx` (admin shell + sidebar, guarded by `requireAdmin`),
  `src/app/(site)/account/layout.tsx` (owner area), `src/app/(site)/sitter/layout.tsx` (sitter area, `requireSitter`).
  Pages inside render only their content (the layout provides the `<main>` / shell).
- Guards `src/lib/auth.ts`: `requireUser()`, `requireAdmin()`, `requireSitter()` (pages) and `getAdminOrNull()`
  (actions). **Every server action must re-check auth + ownership itself** — never trust ids from the client.
- `src/lib/booking-lifecycle.ts`: `allowedTransitions(status, actor)`, `transitionBooking(...)` (status change +
  timestamps + WagPoints refund + sitter counter) and `refreshSitterRating(sitterId)`. Use these, don't re-implement.
- `src/lib/audit.ts` `audit(actorId, action, entityType, entityId, details)` — **call after every admin mutation**.
- `src/lib/settings.ts` `getPlatformSettings()` / `getFees()`; `src/lib/pricing.ts` `priceBooking({... fees})`.
- `src/lib/uploads.ts` `saveUpload(file, folder)` → `/uploads/...` URL (local disk now, Supabase Storage later).
- `src/lib/messaging.ts` `getUnreadCount(userId)` (header + sidebars use it).
- `src/lib/format.ts`, `src/lib/queries.ts`, `src/lib/session.ts` (`getCurrentUser()`), `src/components/FavoriteButton.tsx`.
- After a mutation call `revalidatePath(...)` for affected pages (public pages: `/`, `/sitters`, `/sitters/<slug>`).

Demo logins (passwords in `.demo-credentials`): `emily@wagstays.ca` (owner, 2 pets, bookings in several states, a conversation),
`sarah-mitchell@wagstays.ca` (sitter with pending/confirmed bookings), `admin@wagstays.ca` (admin).
Other owners: `noah.campbell@example.ca`, `ava.singh@example.ca`, `lucas.martin@example.ca`.

## Rules
- Only create/edit files inside **your own route folders** and `src/app/actions/<your-feature>.ts` (+ a new
  `src/lib/<your-feature>.ts` if needed). Do **not** edit `prisma/*`, shared libs above, `ui.tsx`, layouts, Header/Footer,
  or another agent's folders. If you need a shared change, describe it in your report instead.
  (Exception: an agent whose task explicitly lists an existing file may edit that file.)
- Server Components by default; client islands for interactivity. Forms → Server Actions + `useActionState`, inline
  field errors, pending states, success feedback. Destructive actions ask for confirmation.
- Lists: server-side filtering/search/pagination through URL search params (shareable).
- Mobile: must work at 390px without horizontal page scroll (tables scroll inside `Table`).
- Money via `formatMoney(cents)`; dates in the city's time zone (`America/Toronto` default; `City.timeZone` exists).

## Verify before reporting
1. `npx tsc --noEmit` (ignore errors inside `.next/` about LayoutRoutes for routes still being built by others) and
   `npx eslint <your files>` clean.
2. Screenshots at 1440 and 390 — log in with `LOGIN=<email>`:
   `LOGIN=admin@wagstays.ca node /private/tmp/claude-504/-Users-gokhan-yildirim-hayvan-bakici-v2/b2d2252e-e30f-460d-887f-3f19eaa21a3a/scratchpad/shot.js http://localhost:3100/<route> /private/tmp/claude-504/-Users-gokhan-yildirim-hayvan-bakici-v2/b2d2252e-e30f-460d-887f-3f19eaa21a3a/scratchpad/<name>.png 1440 1`
   Read them and fix visual problems. Compare tone with an existing page screenshot so it feels like one product.
3. Exercise every action end-to-end with a Playwright script in the scratchpad dir (also an unauthorised attempt:
   e.g. owner calling an admin action / editing someone else's pet must fail). Check
   `/private/tmp/claude-504/-Users-gokhan-yildirim-hayvan-bakici-v2/b2d2252e-e30f-460d-887f-3f19eaa21a3a/scratchpad/dev.log` for errors.
   Restore demo data you changed (or note it) so other agents' tests still work. Never run `prisma migrate reset` or
   the seed — other agents are using the DB.

## Final report (short)
Routes + files, what each action does and how it's authorised, deviations, shared changes you'd want.
