// Date helpers for messaging. All formatting is pinned to an explicit time zone so server and client agree.
import { createTranslator } from "next-intl";
import { intlLocale } from "@/i18n/routing";
import en from "../../../../../../messages/en/chat.json";
import fr from "../../../../../../messages/fr/chat.json";

export const DEFAULT_TZ = "America/Toronto";

const tr = (locale = "en") => createTranslator({ locale: locale === "fr" ? "fr" : "en", messages: { chat: locale === "fr" ? fr : en }, namespace: "chat.time" });

/** Stable "YYYY-MM-DD" key in the given zone (always en-CA so keys compare across languages). */
export function dayKey(d: Date, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function clockTime(d: Date, tz = DEFAULT_TZ, locale = "en") {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(d);
}

/** "Today", "Yesterday", "Wednesday, September 30" (+ year when not the current year). */
export function dayLabel(d: Date, tz = DEFAULT_TZ, now = new Date(), locale = "en") {
  const k = dayKey(d, tz);
  if (k === dayKey(now, tz)) return tr(locale)("today");
  if (k === dayKey(new Date(now.getTime() - 86_400_000), tz)) return tr(locale)("yesterday");
  const sameYear = k.slice(0, 4) === dayKey(now, tz).slice(0, 4);
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: tz, weekday: "long", month: "long", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) }).format(d);
}

/** Compact relative time for the inbox list: "now", "5m", "3h", "Yesterday", "Mon", "Sep 12". */
export function shortRelative(d: Date, tz = DEFAULT_TZ, now = new Date(), locale = "en") {
  const t = tr(locale);
  const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (mins < 1) return t("now");
  if (mins < 60) return t("minutes", { count: mins });
  if (dayKey(d, tz) === dayKey(now, tz)) return t("hours", { count: Math.floor(mins / 60) });
  if (dayKey(d, tz) === dayKey(new Date(now.getTime() - 86_400_000), tz)) return t("yesterday");
  if (mins < 6 * 24 * 60) return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: tz, weekday: "short" }).format(d);
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: tz, month: "short", day: "numeric" }).format(d);
}
