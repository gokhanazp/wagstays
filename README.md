# WagStays

Pet sitting & dog walking marketplace — Toronto first, Canada-wide later.
Next.js 16 (App Router) · Tailwind CSS 3 (design tokens from the Stitch "Warm Paw Companion" system) · Prisma · Supabase (Postgres, Auth, Storage).

## Run locally

```bash
npm install
# fill .env.supabase (DB password + access token, or keys + connection strings), then:
npm run supabase:setup   # writes .env, sets Auth URLs, runs migrations, seeds demo data
npm run dev -- -p 3100
```
Manual alternative: copy `.env.example` to `.env`, then `npx prisma migrate deploy && npm run db:seed`.

Demo accounts — each has its own random password, written to the git-ignored `.demo-credentials` file by the seed (or rotate them any time with `node --env-file=.env node_modules/.bin/tsx scripts/rotate-demo-passwords.ts`):

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

## Supabase

- **Database:** Prisma → Supabase Postgres (`DATABASE_URL` transaction pooler at runtime, `DIRECT_URL` session pooler for migrations). RLS is enabled on every table with no policies, so the public Data API exposes nothing — all reads/writes go through server code. **Enable RLS on every new table** in future migrations.
- **Auth:** Supabase Auth (email + password). `User.id` = `auth.users.id`; roles live in our `User` table, never in user-editable metadata. `src/proxy.ts` refreshes the session; `getCurrentUser()` in `src/lib/session.ts` is the only entry point pages use. Email links land on `/auth/callback` (PKCE code) or `/auth/confirm` (token hash). Suspending a user also bans them in Supabase Auth.
- **Storage:** bucket `media` (public; pet, sitter and avatar photos) via `src/lib/uploads.ts`; bucket `documents` (private) is ready for ID / police-check files — the application form still stores only file names.
- **Emails:** sign-up confirmation and password reset use Supabase's built-in mailer (rate-limited — configure custom SMTP in the dashboard before launch). Admins can also generate one-time password links from `/admin/users/<id>`.
- The old SQLite migrations are archived in `prisma/sqlite-archive/`.
- Messaging still polls every 10 s; Supabase Realtime can replace the polling later.
