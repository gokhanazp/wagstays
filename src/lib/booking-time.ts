import type { TimeSlot } from "./booking-slots";

import { intlLocale } from "@/i18n/routing";
import { DEFAULT_TIME_ZONE } from "./constants";

// Bookings are in the city's local time (City.timeZone); Toronto is the only active city for now.
export const BOOKING_TZ = DEFAULT_TIME_ZONE;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(v: string | undefined | null): v is string {
  if (!v || !ISO_DATE.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Today's date (YYYY-MM-DD) in the booking timezone. */
export function todayIso(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BOOKING_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The next Saturday strictly after today (booking timezone). */
export function nextSaturdayIso(now = new Date()) {
  const today = todayIso(now);
  const [y, m, d] = today.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(today, ((6 - dow + 7) % 7) || 7);
}

function tzOffsetMs(ts: number) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: BOOKING_TZ,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(ts))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - ts;
}

/** "2026-10-18" + "09:00" (Toronto wall time) -> UTC Date */
export function zonedDateTime(iso: string, hhmm: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let ts = guess - tzOffsetMs(guess);
  ts = guess - tzOffsetMs(ts);
  return new Date(ts);
}

/** "Saturday, Oct 18, 2026" (fr: "samedi 18 oct. 2026") */
export function formatLongDate(iso: string, locale = "en") {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : intlLocale(locale), { timeZone: "UTC", weekday: "long", month: "short", day: "numeric", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  );
}

/** "Oct 18" (fr: "18 oct.") */
export function formatShortDate(iso: string, locale = "en") {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : intlLocale(locale), { timeZone: "UTC", month: "short", day: "numeric" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/** "09:00" -> "9:00 AM" (fr: "9 h", "17 h 30") */
export function formatClock(hhmm: string, locale = "en") {
  const [h, m] = hhmm.split(":").map(Number);
  if (locale !== "en") return `${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}`;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "9:00 – 10:00 AM (Morning)" -> "9:00 – 10:00 AM" (fr: "9 h – 10 h") */
export function slotRange(slot: TimeSlot, locale = "en") {
  if (locale !== "en") return `${formatClock(slot.start, locale)} – ${formatClock(slot.end, locale)}`;
  return slot.label.replace(/\s*\(.*\)\s*$/, "");
}

/** Date (UTC instant) -> "YYYY-MM-DD" and "HH:MM" in booking timezone */
export function toZonedParts(date: Date) {
  const iso = todayIso(date);
  const hhmm = new Intl.DateTimeFormat("en-GB", { timeZone: BOOKING_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  return { iso, hhmm };
}
