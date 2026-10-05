import { createTranslator } from "next-intl";
import { DEFAULT_TIME_ZONE, PET_SIZE_LABELS, SERVICE_LABELS, type PetSize, type ServiceType } from "@/lib/constants";
import { intlLocale } from "@/i18n/routing";
import en from "../../../../../messages/en/account.json";
import fr from "../../../../../messages/fr/account.json";
import enCommon from "../../../../../messages/en/common.json";
import frCommon from "../../../../../messages/fr/common.json";

const tr = (locale = "en") => createTranslator({ locale: locale === "fr" ? "fr" : "en", messages: { account: locale === "fr" ? fr : en }, namespace: "account.shared" });
const trEnums = (locale = "en") => createTranslator({ locale: locale === "fr" ? "fr" : "en", messages: { common: locale === "fr" ? frCommon : enCommon }, namespace: "common.enums" });

export const SERVICE_ICONS: Record<string, string> = {
  DOG_WALKING: "directions_walk",
  BOARDING: "night_shelter",
  DAY_CARE: "wb_sunny",
  DROP_IN: "home",
};

export const serviceLabel = (type: string) => SERVICE_LABELS[type as ServiceType] ?? type;

export const SEX_LABELS: Record<string, string> = { MALE: "Male", FEMALE: "Female" };

export function sizeLabel(size: string | null | undefined, locale = "en") {
  const s = size ? PET_SIZE_LABELS[size as PetSize] : undefined;
  return s ? tr(locale)("sizeWithRange", { size: trEnums(locale)(`petSize.${size as PetSize}`), range: s.range }) : null;
}

export function ageLabel(age: number | null | undefined, locale = "en") {
  if (age == null) return null;
  if (age < 1) return tr(locale)("ageMonths", { count: Math.max(1, Math.round(age * 12)) });
  return tr(locale)("ageYears", { count: Math.round(age * 10) / 10 });
}

/** "3 nights", "1 day", "2 walks" in the visitor's language. */
export const quantityText = (type: string, quantity: number, locale = "en") => tr(locale)("quantity", { type, count: quantity });

/** Booking reference shown to customers, e.g. "#WS-3F9A2C". */
export const bookingRef = (id: string) => `#WS-${id.slice(-6).toUpperCase()}`;

function parts(d: Date, tz: string, opts: Intl.DateTimeFormatOptions, locale = "en") {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: tz, ...opts }).format(d);
}

/** "Sat, Oct 18, 2026" in the city's time zone. */
export function bookingDate(d: Date, tz = DEFAULT_TIME_ZONE, locale = "en") {
  return parts(d, tz, { weekday: "short", month: "short", day: "numeric", year: "numeric" }, locale);
}

/** "Sat, Oct 18" in the city's time zone. */
export function bookingDay(d: Date, tz = DEFAULT_TIME_ZONE, locale = "en") {
  return parts(d, tz, { weekday: "short", month: "short", day: "numeric" }, locale);
}

/** "9:00 a.m." in the city's time zone. */
export function bookingTime(d: Date, tz = DEFAULT_TIME_ZONE, locale = "en") {
  return parts(d, tz, { hour: "numeric", minute: "2-digit" }, locale);
}

/** "Sat, Oct 18, 2026 · 9:00 a.m. – 10:00 a.m." (multi-day stays show both dates). */
export function bookingWhen(start: Date, end: Date, tz = DEFAULT_TIME_ZONE, locale = "en") {
  const sameDay = parts(start, tz, { dateStyle: "short" }) === parts(end, tz, { dateStyle: "short" });
  return sameDay
    ? `${bookingDate(start, tz, locale)} · ${bookingTime(start, tz, locale)} – ${bookingTime(end, tz, locale)}`
    : `${bookingDate(start, tz, locale)}, ${bookingTime(start, tz, locale)} → ${bookingDate(end, tz, locale)}, ${bookingTime(end, tz, locale)}`;
}

// Stored (English) values; the forms show CANCEL_REASON_KEYS[i] translated (account.shared.cancelReasons).
export const CANCEL_REASONS = [
  "My plans changed",
  "My pet is unwell",
  "I found another sitter",
  "I booked the wrong date or time",
  "Something else",
] as const;
export const CANCEL_REASON_KEYS = ["plansChanged", "petUnwell", "foundAnother", "wrongDate", "other"] as const;

export const FREE_CANCEL_HOURS = 24;

/** Hours from now until `d` (negative once it has started). */
export const hoursUntil = (d: Date) => (d.getTime() - Date.now()) / 3_600_000;
