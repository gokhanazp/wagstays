import { DEFAULT_TIME_ZONE, PET_SIZE_LABELS, SERVICE_LABELS, type PetSize, type ServiceType } from "@/lib/constants";

export const SERVICE_ICONS: Record<string, string> = {
  DOG_WALKING: "directions_walk",
  BOARDING: "night_shelter",
  DAY_CARE: "wb_sunny",
  DROP_IN: "home",
};

export const serviceLabel = (type: string) => SERVICE_LABELS[type as ServiceType] ?? type;

export const SEX_LABELS: Record<string, string> = { MALE: "Male", FEMALE: "Female" };

export function sizeLabel(size: string | null | undefined) {
  const s = size ? PET_SIZE_LABELS[size as PetSize] : undefined;
  return s ? `${s.label} (${s.range})` : null;
}

export function ageLabel(age: number | null | undefined) {
  if (age == null) return null;
  if (age < 1) {
    const months = Math.max(1, Math.round(age * 12));
    return `${months} mo${months === 1 ? "" : "s"}`;
  }
  const n = Number.isInteger(age) ? String(age) : age.toFixed(1).replace(/\.0$/, "");
  return `${n} ${age === 1 ? "yr" : "yrs"}`;
}

/** Booking reference shown to customers, e.g. "#WS-3F9A2C". */
export const bookingRef = (id: string) => `#WS-${id.slice(-6).toUpperCase()}`;

function parts(d: Date, tz: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, ...opts }).format(d);
}

/** "Sat, Oct 18, 2026" in the city's time zone. */
export function bookingDate(d: Date, tz = DEFAULT_TIME_ZONE) {
  return parts(d, tz, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/** "9:00 a.m." in the city's time zone. */
export function bookingTime(d: Date, tz = DEFAULT_TIME_ZONE) {
  return parts(d, tz, { hour: "numeric", minute: "2-digit" });
}

/** "Sat, Oct 18, 2026 · 9:00 a.m. – 10:00 a.m." (multi-day stays show both dates). */
export function bookingWhen(start: Date, end: Date, tz = DEFAULT_TIME_ZONE) {
  const sameDay = parts(start, tz, { dateStyle: "short" }) === parts(end, tz, { dateStyle: "short" });
  return sameDay
    ? `${bookingDate(start, tz)} · ${bookingTime(start, tz)} – ${bookingTime(end, tz)}`
    : `${bookingDate(start, tz)}, ${bookingTime(start, tz)} → ${bookingDate(end, tz)}, ${bookingTime(end, tz)}`;
}

export const CANCEL_REASONS = [
  "My plans changed",
  "My pet is unwell",
  "I found another sitter",
  "I booked the wrong date or time",
  "Something else",
] as const;

export const FREE_CANCEL_HOURS = 24;

/** Hours from now until `d` (negative once it has started). */
export const hoursUntil = (d: Date) => (d.getTime() - Date.now()) / 3_600_000;
