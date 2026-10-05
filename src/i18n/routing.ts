import { defineRouting } from "next-intl/routing";

/**
 * Site languages. English is served without a prefix (/sitters), French under /fr (/fr/sitters).
 * The admin panel, API routes, auth callbacks and /offline live outside [locale] and are English only.
 */
export const routing = defineRouting({
  locales: ["en", "fr"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeCookie: { name: "WAG_LOCALE", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" },
});

export type Locale = (typeof routing.locales)[number];

/** BCP 47 tag used for Intl number/date formatting per site language. */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-CA", fr: "fr-CA" };

export const LOCALE_NAMES: Record<Locale, { short: string; name: string }> = {
  en: { short: "EN", name: "English" },
  fr: { short: "FR", name: "Français" },
};

export function intlLocale(locale: string | undefined) {
  return INTL_LOCALE[(locale as Locale) ?? "en"] ?? INTL_LOCALE.en;
}

/** "/fr" for French, "" for English — for building absolute URLs (emails, sitemap, canonical links). */
export function localePrefix(locale: string | undefined) {
  return !locale || locale === routing.defaultLocale ? "" : `/${locale}`;
}
