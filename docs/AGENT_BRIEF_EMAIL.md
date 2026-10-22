# Email notifications brief — shared by all email agents

Project: **WagStays** at `/Users/gokhan.yildirim/hayvan-bakici-v2/wagstays`.
- Stack: Next.js 16, next-intl, Tailwind v3, Prisma on a **LIVE** Supabase DB.
- Also read `docs/AGENT_BRIEF_I18N.md` for the live-DB rules, the i18n rules, Links and formatting. They all still apply.
- The dev server is running at http://localhost:3100. Don't start or stop it.

## Infrastructure (built — use it, don't rewrite it)
- `src/lib/email/send.ts` → `sendEmail({ to, subject, kind, userId, bookingId?, conversationId?, unsubscribe?, idempotencyKey?, ...EmailContent })`.
  - It's the only way to send email. It never throws, and it logs every attempt to the `EmailLog` table.
  - `wasSent({ kind, bookingId?, userId?, since? })` lets you de-duplicate.
  - **Outside production nothing is sent.** The rendered HTML is written to `wagstays/.email-outbox/` (git-ignored) and the log row gets status `dev`.
  - Demo domains (`@wagstays.ca`, `@example.ca`) are **suppressed** (status `skipped`). When testing with demo data, set `EMAIL_SUPPRESS_DOMAINS=""` in the environment of your test script.
- `src/lib/email/layout.ts` → `renderEmail(EmailContent)`. It produces the branded layout (logo, title, greeting, paragraphs, details table, quote, buttons, note, footer).
  - All strings are escaped. Pass plain text, never HTML.
  - For notification categories, pass `footer: { manageUrl, unsubscribeUrl }`. For account/security emails, leave the footer out.
- `src/lib/email/i18n.ts` → `mailT(locale, "mailCommon" | "mailBooking" | "mailMisc")` gives a typed translator.
  - Email copy lives in `messages/{en,fr}/mailBooking.json` (booking agent), `mailMisc.json` (misc agent) and `mailCommon.json` (shared, read-only for you).
  - These namespaces are **not** in `messages/*/index.ts` (so they never ship to the browser). `npm run i18n:check` still checks them.
- `src/lib/email/recipients.ts` → `getRecipient(userId)` returns `{ id, email, firstName, locale, prefs }`, or null for closed accounts. Use `wants(r, "bookings" | "messages" | "reminders")` to check preferences.
- `src/lib/email/links.ts`:
  - `emailUrl(path, locale)` gives an absolute link in the recipient's language.
  - `unsubscribeUrl({ kind: "user", userId, category }, locale)` and `oneClickUnsubscribeUrl(...)`.
  - Pass `unsubscribe: { kind: "user", userId, category }` to `sendEmail` for the List-Unsubscribe header.
- Each user has `User.locale` ("en" | "fr") and `emailBookings` / `emailMessages` / `emailReminders` booleans. The schema is migrated; **don't change `prisma/schema.prisma`**.
- Domain events: `src/lib/events/index.ts` (`emit`). Handlers run after the response.
  - Your handler arrays live in `src/lib/events/email-booking.ts` (booking agent) and `src/lib/events/email-misc.ts` (misc agent). They're already wired in.
  - Push notifications live in `src/lib/events/notifications.ts`; read it for how bookings and recipients are loaded.

## Email rules
- **Write in the recipient's language** (`r.locale`), not the actor's. Address people by first name. Keep it warm and short, in the WagStays voice. Write natural fr-CA, following the glossary in the i18n brief.
- **Every email gets one clear button** that goes to the right page in the app. Never put tokens or credentials in an email.
- **Don't include private data.** No street address, phone number, or full message threads (a short preview of up to 200 characters is fine for new-message emails). Booking dates, pet names, service and total are fine.
- **Respect preferences.** Booking updates use category `bookings`, new messages use `messages`, day-before reminders use `reminders`. Account, security and payment emails are always sent and have no unsubscribe.
- **Be idempotent.** A retried event or cron run must not double-send. Use `wasSent()` and/or `idempotencyKey` (for example ``booking.request:${bookingId}``).
- **Subjects** are short and specific. Examples: "New booking request from Emily", "Sarah accepted your booking 🎉" ("Sarah a accepté votre réservation 🎉").
- Dates and money are formatted in the recipient's locale, in the booking's/city's time zone (America/Toronto). Use the existing helpers: `formatMoney(…, { locale })`, `formatDayRange` / `formatDayLong` / `formatMinuteRange` from `availability-core`, `priceLineLabel`, and `petNames` (with locale).

## Testing
- tsc (look for `error TS`), eslint on your files, `npm run i18n:check`.
- Trigger your handlers with a script run from `wagstays/`:
  ```
  EMAIL_SUPPRESS_DOMAINS="" node --env-file=.env --conditions=react-server node_modules/.bin/tsx your-script.ts
  ```
  - `--conditions=react-server` is required because the libs import `server-only`.
  - Keep scripts in the scratchpad, or delete them afterwards.
  - Call your handler with real demo booking/user IDs. Emily is a pet parent (`emily@wagstays.ca`), Sarah a sitter (`sarah-mitchell@wagstays.ca`). Use English and French recipients: switch a user's `locale` temporarily and **restore it**.
- Open the generated `.email-outbox/*.html` files with Playwright (installed in the scratchpad) at 600px and 380px, and read the screenshots back. The scratchpad is `/private/tmp/claude-504/-Users-gokhan-yildirim-hayvan-bakici-v2/b2d2252e-e30f-460d-887f-3f19eaa21a3a/scratchpad`.
- **Cleanup:**
  - delete the `EmailLog` rows your tests created (by `kind` and time);
  - restore any user/booking fields you changed;
  - delete the `.email-outbox` files.
  - Never create real bookings for real users. If you must create test rows, use demo users only and delete them.

## Report (short)
- Emails implemented: trigger → recipient → subject (en/fr).
- Files changed.
- How duplicates are prevented.
- Test results and screenshot paths.
- Anything you couldn't do.
