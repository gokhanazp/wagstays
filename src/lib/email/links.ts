import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { localePrefix } from "@/i18n/routing";
import { siteUrl } from "@/lib/seo/site";

/** Absolute link into the app in the recipient's language: emailUrl("/account/bookings/1", "fr") → https://…/fr/account/bookings/1 */
export function emailUrl(path: string, locale: string) {
  return `${siteUrl()}${localePrefix(locale)}${path === "/" && localePrefix(locale) ? "" : path}`;
}

export type EmailCategory = "bookings" | "messages" | "reminders";
export type UnsubscribeToken = { kind: "user"; userId: string; category: EmailCategory } | { kind: "newsletter"; subscriberId: string };

function secret() {
  const s = process.env.EMAIL_LINK_SECRET || process.env.CRON_SECRET;
  if (!s) throw new Error("EMAIL_LINK_SECRET is not set");
  return s;
}

/** Signed, non-expiring token for one-click unsubscribe links (no login needed). */
export function signUnsubscribe(payload: UnsubscribeToken) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url").slice(0, 32);
  return `${body}.${sig}`;
}

export function verifyUnsubscribe(token: string | null | undefined): UnsubscribeToken | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url").slice(0, 32);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as UnsubscribeToken;
  } catch {
    return null;
  }
}

/** Page that applies an unsubscribe token (shows a confirmation, supports one-click POST). */
export function unsubscribeUrl(payload: UnsubscribeToken, locale: string) {
  return emailUrl(`/unsubscribe?t=${encodeURIComponent(signUnsubscribe(payload))}`, locale);
}
/** RFC 8058 one-click endpoint (List-Unsubscribe-Post), outside the locale routes. */
export function oneClickUnsubscribeUrl(payload: UnsubscribeToken) {
  return `${siteUrl()}/api/email/unsubscribe?t=${encodeURIComponent(signUnsubscribe(payload))}`;
}
