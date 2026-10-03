# Deploying WagStays (GitHub → Vercel, Supabase)

## 1. Import the repo in Vercel
New Project → import `gokhanazp/wagstays` → Framework: Next.js (auto). Root directory: repository root.
Functions run in `yul1` (Montréal, see `vercel.json`) — the same city as the Supabase database (`ca-central-1`).

## 2. Environment variables (Production + Preview)
Copy the values from your local `.env` (never commit them):

| Name | Value |
|---|---|
| `DATABASE_URL` | transaction pooler URL, port **6543**, ending `?pgbouncer=true&connection_limit=5&pool_timeout=20&connect_timeout=10&socket_timeout=30` |
| `DIRECT_URL` | session pooler URL, port **5432** (only used by `prisma migrate`, but keep it set) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://yvateuufdvxmaowgcjch.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (server-only) |
| `NEXT_PUBLIC_SITE_URL` | your production URL, e.g. `https://wagstays.vercel.app` (later the real domain) |

`npm install` runs `prisma generate` automatically (postinstall). Migrations are **not** run on deploy —
run `npx prisma migrate deploy` locally (it uses `DIRECT_URL`) whenever a new migration is added, before pushing.

## 3. Supabase Auth URLs
Supabase → Authentication → URL Configuration:
- **Site URL:** the production URL (same as `NEXT_PUBLIC_SITE_URL`).
- **Redirect URLs:** `https://<production-domain>/**`, `http://localhost:3100/**`, and for preview deploys
  `https://*-<your-vercel-team>.vercel.app/**`.

## 4. Email (before you have a domain)
- Supabase's built-in mailer only delivers to members of your Supabase organisation and is heavily rate-limited.
- Resend without a verified domain can only send from `onboarding@resend.dev` **to your own Resend account email** —
  it can't email real users either.
- So until the domain exists: Authentication → Sign In / Providers → Email → turn **off "Confirm email"** so new
  sign-ups are logged in straight away (the app handles both modes). Password resets: admins can create a one-time
  link from `/admin/users/<id>`.

## 5. Email after buying the domain (Resend)
1. Resend → Domains → add `wagstays.ca` (or similar) → add the DNS records it shows (SPF, DKIM, optional DMARC) → Verify.
2. Resend → API Keys → create a key with "Sending access" for that domain.
3. Supabase → Authentication → Emails → SMTP Settings → enable custom SMTP:
   host `smtp.resend.com`, port `465`, username `resend`, password = the API key,
   sender email `hello@<domain>`, sender name `WagStays`.
4. Raise the email rate limit (Authentication → Rate Limits) and turn **"Confirm email" back on**.
5. Optional: customise the email templates (Authentication → Emails → Templates) with the WagStays colours.
