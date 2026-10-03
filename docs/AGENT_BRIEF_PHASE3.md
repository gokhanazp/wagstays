# Phase 3 brief — shared by all agents

Project: **WagStays** at `/Users/gokhan.yildirim/hayvan-bakici-v2/wagstays` — Next.js 16 App Router + TS, Tailwind v3
(design tokens), Prisma → **Supabase Postgres (production database!)**, Supabase Auth/Storage/Realtime, deployed on Vercel
from GitHub `main`. Read `README.md`, `prisma/schema.prisma`, `docs/LOCALIZATION.md` first. Next 16 differs from your
training data — check `node_modules/next/dist/docs/` for unfamiliar APIs. Zod v4.

Dev server: **http://localhost:3100** (already running; don't start/stop it).

## ⚠️ The database is LIVE
Local dev and https://wagstays.vercel.app share one Supabase database with a **real user** in it.
- **Never** run `prisma migrate reset`, `db push`, the seed, or any bulk delete/update. Never touch users outside the
  demo set (emails ending `@wagstays.ca` / `@example.ca`).
- The schema for this phase is **already migrated** (see migration `20261003120000_…`). **Do not change
  `prisma/schema.prisma` or add migrations.** If you truly need a schema change, stop and describe it in your report.
- Test with demo accounts (passwords in `/Users/gokhan.yildirim/hayvan-bakici-v2/wagstays/.demo-credentials`, helper
  `/private/tmp/claude-504/-Users-gokhan-yildirim-hayvan-bakici-v2/b2d2252e-e30f-460d-887f-3f19eaa21a3a/scratchpad/creds.js` → `(email) => password`;
  never print or commit passwords) or with throwaway users you create via the Supabase admin API
  (`email: qa+<feature>-<timestamp>@example.ca`) **and delete afterwards** (auth user + `User` row + their data).
- Every test row you create (bookings, tickets, reviews, messages, availability edits…) must be removed or restored
  before you finish. Report anything you couldn't clean up.

## Already in place (use, don't reimplement)
- `src/lib/events/index.ts` — `emit(DomainEvent)`; already emitted for booking created/confirmed/declined/completed/
  cancelled (from `booking-lifecycle.ts` and the booking action) and `message.sent`. Feature handlers live in
  `src/lib/events/points.ts` and `src/lib/events/notifications.ts` (each owned by one agent).
- `src/lib/wagpoints.ts` — `changePoints(client, { userId, amountCents, reason, note, bookingId })`: the ONLY way to change a
  WagPoints balance (writes the `WagPointsEntry` ledger).
- `src/lib/booking-lifecycle.ts` (`allowedTransitions`, `transitionBooking`, `refreshSitterRating`), `src/lib/auth.ts`
  guards, `src/lib/audit.ts`, `src/lib/settings.ts`, `src/lib/pricing.ts` (`priceBooking`), `src/lib/pets.ts`.
- UI kit: `src/components/ui.tsx`, form controls `src/components/forms/{Select,DatePicker,Popover}.tsx` (never use native
  `<select>`/date inputs), `MobileStickyBar`, `DashboardShell` layouts (`/account`, `/sitter`, `/admin`).
- Design language: Warm Paw Companion (see existing pages) — white cards, pill buttons, Material Symbols, mobile-first.

## Rules
- Only edit files listed in your task (plus new files in your own folders). If you must touch a shared file, keep the
  edit minimal and **re-read it right before editing** — other agents work in parallel.
- Every server action: auth + ownership check, zod validation, `revalidatePath`. Admin mutations: `audit(...)`.
- New tables are RLS-locked; data access only through server code (Prisma).
- Mobile (390px) and desktop (1440px) must both look right; no horizontal scroll.
- Verify: `npx tsc --noEmit` (look for `error TS`, ignore `.next/`), `npx eslint <your files>`, Playwright end-to-end in the
  scratchpad dir (playwright installed there), screenshots read back. Don't commit — I review and commit.

## Report (short)
What you built (routes/files), how it's authorised, test results, cleanup done, open questions.
