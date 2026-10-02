# WagStays

Pet sitting & dog walking marketplace — Toronto first, Canada-wide later.
Next.js 16 (App Router) · Tailwind CSS 3 (design tokens from the Stitch "Warm Paw Companion" system) · Prisma · SQLite (local) → Supabase (later).

## Run locally

```bash
npm install
npx prisma migrate dev   # creates prisma/dev.db
npm run db:seed          # Toronto data, demo users
npm run dev
```

Demo accounts (password `wagstays123`):

| Account | Role | What to try |
|---|---|---|
| `emily@wagstays.ca` | Pet parent | `/account/bookings` (upcoming, completed + reviewed), `/account/pets`, `/messages`, book Sarah |
| `sarah-mitchell@wagstays.ca` | Sitter | `/sitter` — 2 pending requests to accept/decline, profile & rates editor |
| `admin@wagstays.ca` | Admin | `/admin` — approve application WS-31877, cities, fees, users, reviews |

Other sitters log in as `<slug>@wagstays.ca`; extra owners: `noah.campbell@example.ca`, `ava.singh@example.ca`, `lucas.martin@example.ca`.

## Structure

| Path | What |
|---|---|
| `src/app/(site)/` | Public pages (header + footer layout) |
| `src/app/actions/` | Server actions (auth, favourites, booking, applications…) |
| `src/lib/queries.ts` | Data access used by pages |
| `src/lib/pricing.ts` | Single source of truth for booking prices (fees, WagPoints, HST) |
| `src/lib/session.ts` | Local JWT cookie auth — to be replaced by Supabase Auth |
| `prisma/schema.prisma` | Data model (Postgres-compatible; enum-like fields are strings) |
| `docs/LOCALIZATION.md` | TR design → EN-CA copy, names, places, prices |
| `src/app/admin/` | Admin panel (requireAdmin): dashboard, applications, sitters, bookings, users, reviews, cities, settings, audit log |
| `src/app/(site)/account/` · `sitter/` · `messages/` | Pet parent area · sitter dashboard · messaging |
| `src/lib/auth.ts` | `requireUser` / `requireSitter` / `requireAdmin` guards (every server action re-checks) |
| `src/lib/booking-lifecycle.ts` | Allowed booking status transitions per actor, WagPoints refunds, rating recompute |
| `src/lib/settings.ts` | Platform fees from `PlatformSettings` (edited in /admin/settings) |
| `src/lib/audit.ts` | Admin audit trail |
| `src/proxy.ts` | Redirects signed-out visitors away from private areas |

## Booking lifecycle

`PENDING` (owner requests) → `CONFIRMED` / `DECLINED` (sitter or admin) → `COMPLETED` (sitter or admin, after start) → owner can review.
`CANCELLED` by the owner (pending/confirmed), the sitter (confirmed) or an admin. WagPoints used are refunded on cancel/decline.

## Cities

Only Toronto is active (`City.isActive`). Other cities are seeded inactive and are switched on from `/admin/cities` (a city needs at least one neighbourhood). Active cities automatically appear in the home search suggestions, the search location picker (`/sitters?city=<slug>`) and the sitter application form; approved sitters are placed in the city of the neighbourhood they applied for. Taxes come from `City.taxRateBps`, time zones from `City.timeZone` (date formatting still defaults to Toronto time — pass `city.timeZone` through when a second time zone goes live).

## Moving to Supabase

1. `provider = "postgresql"` in `prisma/schema.prisma`, set `DATABASE_URL` (pooled) and `directUrl` (direct) to the Supabase strings.
2. Re-create migrations (`prisma migrate dev --name init`) — SQLite migrations don't carry over.
3. Replace `src/lib/session.ts` internals with Supabase Auth; keep `getCurrentUser()` as the interface.
4. Uploads: `src/lib/uploads.ts` writes to `public/uploads` — swap its body for Supabase Storage. Application documents (ID / police check) are currently only stored by file name.
5. Password set/reset links (`src/lib/password-tokens.ts`, `/set-password`) are shown to admins instead of emailed; replace with Supabase Auth's email flows.
6. Text search uses Prisma `contains` (case-insensitive on SQLite only) — add `mode: "insensitive"` on Postgres.
7. Messaging polls every 10 s; Supabase Realtime can replace the polling.
