import "server-only";
import { headers } from "next/headers";
import { localizedPath } from "@/i18n/server";

/**
 * Absolute origin for links in auth emails (sign-up confirmation, password reset).
 * Uses the host the visitor is actually on (Vercel sets x-forwarded-host), so a stale NEXT_PUBLIC_SITE_URL can't
 * send people to localhost. NEXT_PUBLIC_SITE_URL is only a fallback when there is no request host.
 * The resulting URL must be in Supabase → Auth → URL Configuration → Redirect URLs.
 */
export async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100").replace(/\/$/, "");
}

/**
 * Where Supabase auth emails send the user: /auth/confirm (token-hash verification, works on any device — unlike the
 * PKCE /auth/callback, which needs the browser that started the flow) and then `next`, in the current language.
 * The email templates append `&token_hash=…&type=…` to this URL ({{ .RedirectTo }}).
 */
export async function emailLinkTarget(next: string) {
  return `${await getOrigin()}/auth/confirm?next=${encodeURIComponent(await localizedPath(next))}`;
}
