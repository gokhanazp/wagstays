import { createTranslator } from "next-intl";
import { intlLocale } from "@/i18n/routing";
import en from "../../messages/en/apply.json";
import fr from "../../messages/fr/apply.json";
import { DEFAULT_TIME_ZONE } from "./constants";

const tr = (locale = "en") =>
  createTranslator({ locale: locale === "fr" ? "fr" : "en", messages: { apply: locale === "fr" ? fr : en }, namespace: "apply.meetGreet" });
// Meet & Greet scheduling helpers (sitter onboarding, step 2).
// Slots are wall-clock times in the coordinator team's time zone (launch city).
export const MEET_GREET_TZ = DEFAULT_TIME_ZONE;
export const MEET_GREET_SLOTS = ["10:30", "14:00", "16:15", "18:00"] as const;
export const DEFAULT_SLOT_INDEX = 2;

const DAY_MS = 86_400_000;

/** "2026-10-03" for the given instant, in `tz`. */
function ymd(date: Date, tz = MEET_GREET_TZ) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Milliseconds `tz` is ahead of UTC at `date` (negative for the Americas). */
function tzOffsetMs(date: Date, tz: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Converts a wall-clock time in `tz` (e.g. "2026-10-03" 16:15) to a UTC Date. */
function zonedTime(day: string, hhmm: string, tz = MEET_GREET_TZ) {
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = guess - tzOffsetMs(new Date(guess), tz);
  return new Date(guess - tzOffsetMs(new Date(first), tz));
}

export function formatTime(date: Date, tz = MEET_GREET_TZ, locale = "en") {
  if (locale === "fr") return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(date);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true })
    .format(date)
    .replace(/\s?a\.m\./i, " AM")
    .replace(/\s?p\.m\./i, " PM");
}

/** "Today, 6:30 PM" / "Tomorrow, 4:15 PM" / "Sat, Oct 3, 4:15 PM" (fr: "Demain, 16 h 15"). */
export function formatRelativeDayTime(date: Date, now = new Date(), tz = MEET_GREET_TZ, locale = "en") {
  const t = tr(locale);
  const day = ymd(date, tz);
  let prefix: string;
  if (day === ymd(now, tz)) prefix = t("today");
  else if (day === ymd(new Date(now.getTime() + DAY_MS), tz)) prefix = t("tomorrow");
  else prefix = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(date);
  return t("dayTime", { day: prefix, time: formatTime(date, tz, locale) });
}

export type MeetGreetSlot = { iso: string; label: string };

/** The suggested slots for the day `dayOffset` days from `now` (1 = tomorrow). */
export function getSuggestedSlots(now = new Date(), dayOffset = 1, locale = "en"): MeetGreetSlot[] {
  const day = ymd(new Date(now.getTime() + dayOffset * DAY_MS));
  return MEET_GREET_SLOTS.map((t) => {
    const d = zonedTime(day, t);
    return { iso: d.toISOString(), label: formatTime(d, MEET_GREET_TZ, locale) };
  });
}

/** True when `iso` is one of the bookable slots (today through the day after tomorrow, still in the future). */
export function isBookableSlot(iso: string, now = new Date()) {
  const t = new Date(iso).getTime();
  if (!(t > now.getTime())) return false;
  return [0, 1, 2].some((offset) => getSuggestedSlots(now, offset).some((s) => new Date(s.iso).getTime() === t));
}
