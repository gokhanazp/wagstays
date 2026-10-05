# i18n brief — shared by all translation agents

Project: **WagStays** at `/Users/gokhan.yildirim/hayvan-bakici-v2/wagstays`: Next.js 16 App Router + TypeScript,
Tailwind v3, Prisma → **Supabase Postgres (production database!)**, next-intl 4. Next 16 differs from your training data;
check `node_modules/next/dist/docs/` for unfamiliar APIs.

**Goal:** every user-facing string in your area comes from message files. The English copy must stay **exactly** as it
is today (same words, same punctuation). Add a natural **Canadian French (fr-CA)** translation.
Dev server: **http://localhost:3100** (already running; don't start or stop it).

## ⚠️ The database is LIVE
- **Never** run `prisma migrate reset`, `db push`, the seed, or any bulk write. Don't change `prisma/schema.prisma`.
- Read-only browsing is fine. If you test a form end to end, use demo accounts. Passwords are in `.demo-credentials`;
  the helper is
  `/private/tmp/claude-504/-Users-gokhan-yildirim-hayvan-bakici-v2/b2d2252e-e30f-460d-887f-3f19eaa21a3a/scratchpad/creds.js`
  → `(email) => password`. Never print or commit passwords. Remove or restore any rows you create.

## How i18n works here (already built — use it, don't change it)
- **Routing.**
  - English has no prefix (`/sitters`); French lives under `/fr` (`/fr/sitters`).
  - Pages are in `src/app/[locale]/(site)/…`.
  - `/admin`, `/api`, `/auth`, `/r` and `/offline` are English-only, outside `[locale]`. **Don't translate admin.**
- **Messages.**
  - Files: `messages/en/<namespace>.json` and `messages/fr/<namespace>.json`, one file per namespace.
  - Keys are typed against English (`src/i18n/types.d.ts`), so `t("typo")` is a tsc error.
  - `npm run i18n:check` verifies that fr has exactly the en keys, with the same `{placeholders}` and `<tags>`.
- **Server components.** `const t = await getTranslations("ns")` and `const locale = await getLocale()` (from `next-intl/server`).
  Sync server components may use `useTranslations`.
- **Client components.** `const t = useTranslations("ns")` and `const locale = useLocale()` (from `next-intl`).
- **Metadata.** Use `export async function generateMetadata()` with `getTranslations` instead of a static `metadata` object.
- **Server actions.**
  - Call `const t = await getTranslations("ns")` inside the action and return translated error strings.
  - zod messages declared at module scope can't be translated. Build the schema inside the action:
    `const schema = (t) => z.object({...})`.
  - Alternative: keep error *codes* and translate them in the component.
- **Links and navigation.**
  - Always `import { Link, useRouter, usePathname } from "@/i18n/navigation"`. These keep the language.
  - Never `next/link`, except for `/admin` links, which must stay `next/link`.
  - For redirects: `redirect(await localizedPath("/x"))`, with `localizedPath` from `@/i18n/server` and `redirect` from
    `next/navigation`. Most of these are already converted.
  - Plain `<a href="/x">` loses the language. Convert it to `Link` unless it's external.
- **Formatting.** Pass `locale` everywhere:
  - `formatMoney(cents, { exact, locale })`: fr renders `32 $` / `3,50 $`.
  - `formatDate(d, tz, locale)`, `formatDateTime(d, tz, locale)` (`@/components/ui`).
  - `formatIsoDate(iso, opts, locale)`, `formatIsoRange(a, b, locale)` (`@/components/forms/DatePicker`).
  - `timeAgo(date, now, locale)`, `formatDistance(km, locale)`, `formatRating(r, locale)` (`@/lib/format`).
  - Raw `Intl.*` or `toLocale*String("en-CA")`: use `intlLocale(locale)` from `@/i18n/routing` instead of `"en-CA"`.
- **Shared enums.** These are in the `common` namespace (`messages/en/common.json` → `enums`): service, unit, perUnit,
  petSize, petKind, petKindPlural, bookingStatus, applicationStatus, role, weekday, weekdayShort.
  - Example: `t("enums.service." + type)` with `useTranslations("common")`.
  - Keep using `SERVICE_LABELS` etc. **only** in admin. Don't edit `common.json`; if you need a new shared key, report it.
- **Plurals.** Use ICU: `"{count, plural, one {# pet} other {# pets}}"`.
  - Never build sentences from fragments or `+ "s"`.
  - Use `{name}` placeholders, and `t.rich("key", { b: (c) => <strong>{c}</strong> })` for inline markup.
- **Data from the database stays as is:** sitter bios, pet names, reviews, neighbourhood and city names.
  Seeded/demo content is **not** translated.

## French style (fr-CA)
- Formal *vous*. Natural Québec/Canadian French, not a word-for-word translation.
- Keep the length close to the English so layouts don't break. French is often about 20% longer, so check at 390px.
- OQLF typography: **no** space before `! ? ;`. A non-breaking space before `:` is optional, so keep it consistent
  (none). Use « » only for real quotations. Money is `32 $`.

### Glossary
| English | French |
|---|---|
| sitter / pet sitter | gardien (pl. gardiens); "gardien d'animaux" |
| dog walker / dog walking | promeneur de chiens / promenade de chiens |
| pet parent / owner | propriétaire (d'animal) |
| booking / book | réservation / réserver |
| boarding (overnight) | pension (de nuit) |
| doggy day care | garderie pour chiens |
| drop-in visit | visite à domicile |
| Meet & Greet | rencontre préalable |
| review / rating | avis / note |
| neighbourhood | quartier |
| email (noun) | courriel |
| sign up / log in / log out | s'inscrire / se connecter / se déconnecter |
| favourites | favoris |
| HST / GST | TVH / TPS |
| PIPEDA | LPRPDE |
| Police Vulnerable Sector Check | vérification des antécédents en vue d'un travail auprès de personnes vulnérables |
| background check | vérification des antécédents |
| first aid & CPR | premiers soins et RCR |
| support (help) | soutien |
| dashboard | tableau de bord |
| availability | disponibilités |
| time off | congés / absences |
| payout / earnings | versement / revenus |
| service fee | frais de service |

Brand names stay in English: WagStays, WagPoints, WagShield, Wag Academy, Super Sitter (in French: "Super gardien").

## Rules
- **Ownership.** Only edit the files listed in your task, plus your own namespace files
  (`messages/{en,fr}/<your namespaces>.json`). Other agents are working in parallel on the other namespaces and areas.
- **Shared files.** If you must touch one, keep the edit minimal and re-read it right before editing.
- **Don't change behaviour, layout, classes or design.** Only text, and the `locale` plumbing it needs.
- **Key naming.** Nested by page or component, camelCase (`profile.about.title`). No unused keys.

## Verify
1. `npx tsc --noEmit 2>&1 | grep "error TS"` → nothing in your files (ignore `.next/`).
2. `npx eslint <your files>` and `npm run i18n:check` (your namespaces clean).
3. Grep your files for leftover English literals in JSX and attributes (`aria-label`, `placeholder`, `title`, `alt`).
4. Playwright from the scratchpad dir (playwright is installed there): visit every page in your area at **both**
   `/x` and `/fr/x`, at 390px and 1440px.
   - Read the screenshots back.
   - Check for no English left on /fr, no overflow or horizontal scroll, and English unchanged.
   - Logged-in pages: log in as a demo user (`emily@wagstays.ca` is a pet parent, `sarah@wagstays.ca` is a sitter).
   - The service worker blocks `networkidle`, so wait for `load`.

## Report (short)
Files converted, namespaces, number of keys, test results (with screenshot paths), anything left in English and why,
and any new `common` keys you'd like added.

## Shared `src/lib` files with user-facing text
Each such file has **one owner agent** (listed in its task).
- **Owner.** Add an optional last parameter, `locale = "en"` (or `{ locale }` in an options object), and translate inside
  the file with a translator built from the owner's namespace file:
  ```ts
  import { createTranslator } from "next-intl";
  import en from "../../messages/en/booking.json";
  import fr from "../../messages/fr/booking.json";
  const tr = (locale = "en") =>
    createTranslator({ locale, messages: { booking: locale === "fr" ? fr : en }, namespace: "booking.price" });
  ```
  - This works on server and client, and existing callers keep working (English).
  - Don't change return shapes, so other areas aren't broken.
- **Callers in other areas.** Pass your `locale` *if* the function already accepts it when you get there. Otherwise
  leave the call as is: the lead wires the remaining call sites at the end. Never edit a lib file you don't own.
- **Server-generated notifications** (`src/lib/events/notifications.ts`, push texts) stay English for now. Don't touch them.
