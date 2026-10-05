import { intlLocale } from "@/i18n/routing";

// Formatting helpers take the site locale ("en" | "fr", from useLocale()/getLocale()); English is the default
// so admin/server-only callers can omit it.
const moneyFormats = new Map<string, Intl.NumberFormat>();
function moneyFormat(locale: string, exact: boolean) {
  const key = `${locale}:${exact}`;
  let f = moneyFormats.get(key);
  if (!f) {
    f = new Intl.NumberFormat(intlLocale(locale), {
      style: "currency",
      currency: "CAD",
      ...(exact ? { minimumFractionDigits: 2 } : { maximumFractionDigits: 0 }),
    });
    moneyFormats.set(key, f);
  }
  return f;
}

/** "$32" / "32 $" for whole-dollar amounts, "$3.50" / "3,50 $" otherwise. Pass `{ exact: true }` to always show cents. */
export function formatMoney(cents: number, opts: { exact?: boolean; locale?: string } = {}) {
  const dollars = cents / 100;
  const s = moneyFormat(opts.locale ?? "en", !!opts.exact || cents % 100 !== 0).format(dollars);
  return s.replace("CA$", "$");
}

export function formatDistance(km: number, locale = "en") {
  const n = new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 1, minimumFractionDigits: km < 1 ? 0 : 1 });
  return km < 1 ? `${Math.round(km * 1000)} m` : `${n.format(km)} km`;
}

export function formatRating(r: number, locale = "en") {
  const s = r >= 5 ? "5.0" : r.toFixed(2).replace(/0$/, "");
  return locale === "fr" ? s.replace(".", ",") : s;
}

export function timeAgo(date: Date, now = new Date(), locale = "en") {
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" });
  if (days < 1) return rtf.format(0, "day");
  if (days < 7) return rtf.format(-days, "day");
  if (days < 30) return rtf.format(-Math.floor(days / 7), "week");
  return rtf.format(-Math.floor(days / 30), "month");
}

/** Haversine distance in km */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
