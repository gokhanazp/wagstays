// Pure availability rules shared by the server (src/lib/availability.ts — the source of truth that
// every booking is re-validated against) and the client widgets (calendar days, free time slots).
// No server-only imports here: everything works on an `AvailabilitySnapshot` loaded by the server.
//
// Dates are local calendar dates ("YYYY-MM-DD") in the sitter's city time zone; minutes are minutes
// after local midnight. Instants are epoch milliseconds. All maths on dates goes through UTC-noon
// calendar arithmetic so DST changes never shift a day.

import { intlLocale } from "@/i18n/routing";
import { bookingT } from "./booking-messages";
import { TIME_SLOTS } from "./booking-slots";

export type WeeklyRange = { weekday: number; startMinute: number; endMinute: number };
export type TimeOffRange = { startDate: string; endDate: string; note?: string | null; id?: string };
/** `petCount` = places the booking takes (stays only; missing = 1). */
export type BusyBooking = { id: string; type: string; startAt: number; endAt: number; petCount?: number };

export type AvailabilitySnapshot = {
  timeZone: string;
  noticeHours: number;
  /** pets that can board / attend day care at the same time */
  capacity: number;
  hours: WeeklyRange[];
  timeOff: TimeOffRange[];
  /** the sitter's PENDING / CONFIRMED bookings overlapping the loaded window */
  bookings: BusyBooking[];
};

export const SLOT_STEP_MINS = 30;
export const MIN_WEEKS = 2;
export const MAX_WEEKS = 12;
export const DEFAULT_WEEKS = 4;
export const MAX_STAY_DAYS = 30;
/** Limits enforced by the sitter availability editor (src/app/actions/availability.ts). */
export const AVAILABILITY_LIMITS = { maxRangesPerDay: 4, maxCapacity: 10, maxNoticeHours: 168, maxTimeOffDays: 365 } as const;
export const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
/** WEEKDAY_LABELS[i] in the UI language ("Monday" / fr "lundi" — French weekday names are lower case). */
export function weekdayLabel(weekday: number, locale = "en") {
  if (locale === "en") return WEEKDAY_LABELS[weekday];
  return new Date(Date.UTC(2000, 0, 2 + weekday, 12)).toLocaleDateString(intlLocale(locale), { weekday: "long", timeZone: "UTC" });
}

export const isStayService = (type: string) => type === "BOARDING" || type === "DAY_CARE";
export const isVisitService = (type: string) => type === "DOG_WALKING" || type === "DROP_IN";
/** Weekly recurring series are offered for walks, drop-ins and day care (not boarding). */
export const canRecur = (type: string) => type !== "BOARDING";

/** Length of one walk / drop-in visit. */
export function visitMinutes(type: string, durationMins: number | null | undefined) {
  return durationMins ?? (type === "DROP_IN" ? 30 : 60);
}

/* ─────────────────────────── calendar dates ─────────────────────────── */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const toUtcNoon = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 12);
};

export function isIsoDay(v: unknown): v is string {
  if (typeof v !== "string" || !ISO_DATE.test(v)) return false;
  return new Date(toUtcNoon(v)).toISOString().slice(0, 10) === v;
}

export function addDays(iso: string, days: number) {
  return new Date(toUtcNoon(iso) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Whole calendar days from `a` to `b` (b - a). */
export function daysBetween(a: string, b: string) {
  return Math.round((toUtcNoon(b) - toUtcNoon(a)) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(iso: string) {
  return new Date(toUtcNoon(iso)).getUTCDay();
}

/** Every date from `from` to `to`, inclusive. */
export function eachDate(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/* ─────────────────────────── time zones ─────────────────────────── */

const partsFmt = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string) {
  let f = partsFmt.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFmt.set(tz, f);
  }
  return f;
}

/** Local date + minute-of-day of an instant in `tz`. */
export function zonedParts(ms: number, tz: string) {
  const p = Object.fromEntries(fmt(tz).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { iso: `${p.year}-${p.month}-${p.day}`, minute: Number(p.hour) * 60 + Number(p.minute) };
}

function offsetMs(ms: number, tz: string) {
  const p = Object.fromEntries(fmt(tz).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
}

/** Local wall time (date + minutes after midnight) in `tz` → epoch ms. DST-safe. */
export function zonedInstant(iso: string, minute: number, tz: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, Math.floor(minute / 60), minute % 60);
  let ts = guess - offsetMs(guess, tz);
  ts = guess - offsetMs(ts, tz);
  return ts;
}

export const todayIn = (tz: string, now: number) => zonedParts(now, tz).iso;

/* ─────────────────────────── formatting ─────────────────────────── */

export const minuteToHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export function hhmmToMinute(v: string | null | undefined) {
  const m = /^(\d{2}):(\d{2})$/.exec(v ?? "");
  if (!m) return null;
  const n = Number(m[1]) * 60 + Number(m[2]);
  return Number(m[1]) < 24 && Number(m[2]) < 60 ? n : null;
}

/** `slot` URL / form value → minute of day. Accepts "HH:MM" and the legacy keys ("morning", "midday"…). */
export function parseSlot(v: string | null | undefined) {
  const legacy = TIME_SLOTS.find((s) => s.key === v);
  return hhmmToMinute(legacy ? legacy.start : v);
}

/** 540 → "9:00 AM", 1440 → "12:00 AM" (midnight, end of day). French: "9 h", "9 h 30", "24 h". */
export function formatMinute(m: number, locale = "en") {
  if (locale !== "en") {
    const mm = m % 60;
    return `${Math.floor(m / 60)} h${mm ? ` ${String(mm).padStart(2, "0")}` : ""}`;
  }
  const h = Math.floor(m / 60) % 24;
  return `${h % 12 || 12}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "9:00 – 10:00 AM" / "11:30 AM – 12:30 PM" (fr: "9 h – 10 h") */
export function formatMinuteRange(start: number, end: number, locale = "en") {
  const a = formatMinute(start, locale);
  const b = formatMinute(end, locale);
  if (locale !== "en") return `${a} – ${b}`;
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)} – ${b}` : `${a} – ${b}`;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function dayFmt(locale: string, long: boolean) {
  const k = `${locale}:${long}`;
  let f = fmtCache.get(k);
  if (!f) {
    f = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", ...(long && { weekday: "short" }), month: "short", day: "numeric" });
    fmtCache.set(k, f);
  }
  return f;
}
/** "Oct 18" (fr: "18 oct.") */
export const formatDay = (iso: string, locale = "en") => dayFmt(locale, false).format(new Date(toUtcNoon(iso)));
/** "Sat, Oct 18" (fr: "sam. 18 oct.") */
export const formatDayLong = (iso: string, locale = "en") => dayFmt(locale, true).format(new Date(toUtcNoon(iso)));
/** "Oct 18–22" / "Oct 30 – Nov 2" / "Oct 18" (fr: "18–22 oct." / "30 oct. – 2 nov.") */
export function formatDayRange(from: string, to?: string | null, locale = "en") {
  if (!to || to === from) return formatDay(from, locale);
  const [a, b] = [formatDay(from, locale), formatDay(to, locale)];
  if (locale !== "en") {
    const sameMonth = from.slice(0, 7) === to.slice(0, 7);
    return sameMonth ? `${Number(from.slice(8, 10))}–${b}` : `${a} – ${b}`;
  }
  return a.split(" ")[0] === b.split(" ")[0] ? `${a}–${b.split(" ")[1]}` : `${a} – ${b}`;
}

/** "3 nights", "1 day", "2 walks" (fr: "3 nuits", "1 jour", "2 promenades") */
export function quantityLabel(type: string, quantity: number, locale = "en") {
  return bookingT(locale)("time.quantity", { type, count: quantity });
}

/* ─────────────────────────── rules ─────────────────────────── */

export function isTimeOff(snap: AvailabilitySnapshot, iso: string) {
  return snap.timeOff.some((t) => t.startDate <= iso && iso <= t.endDate);
}

/** Opening ranges for a local date (empty on closed weekdays and time off), sorted. */
export function rangesOn(snap: AvailabilitySnapshot, iso: string) {
  if (isTimeOff(snap, iso)) return [];
  const wd = weekdayOf(iso);
  return snap.hours
    .filter((h) => h.weekday === wd && h.endMinute > h.startMinute)
    .map((h) => ({ start: h.startMinute, end: h.endMinute }))
    .sort((a, b) => a.start - b.start);
}

export const isOpenDay = (snap: AvailabilitySnapshot, iso: string) => rangesOn(snap, iso).length > 0;

/** Earliest instant a new booking may start (minimum notice). */
export const noticeCutoff = (snap: AvailabilitySnapshot, now: number) => now + snap.noticeHours * 3_600_000;

/** Local dates a stay booking occupies: boarding = its nights, day care = its days. */
export function stayDates(b: Pick<BusyBooking, "type" | "startAt" | "endAt">, tz: string) {
  const s = zonedParts(b.startAt, tz).iso;
  const e = zonedParts(b.endAt, tz).iso;
  const last = b.type === "BOARDING" ? addDays(e, -1) : e;
  return eachDate(s, last < s ? s : last);
}

/** Places taken by stay bookings (boarding + day care share the capacity; one per pet) on each local date. */
export function stayLoad(snap: AvailabilitySnapshot, exclude?: string | null) {
  const load = new Map<string, number>();
  for (const b of snap.bookings) {
    if (!isStayService(b.type) || b.id === exclude) continue;
    const places = Math.max(1, b.petCount ?? 1);
    for (const d of stayDates(b, snap.timeZone)) load.set(d, (load.get(d) ?? 0) + places);
  }
  return load;
}

export type Slot = { minute: number; end: number; label: string; available: boolean; reason?: "notice" | "booked" };

/** 30-minute-step start times for a walk / drop-in of `duration` minutes on `iso`. */
export function visitSlots(snap: AvailabilitySnapshot, iso: string, duration: number, now: number, exclude?: string | null, locale = "en"): Slot[] {
  const cutoff = noticeCutoff(snap, now);
  const seen = new Set<number>();
  const out: Slot[] = [];
  for (const r of rangesOn(snap, iso)) {
    for (let m = r.start; m + duration <= r.end; m += SLOT_STEP_MINS) {
      if (seen.has(m)) continue;
      seen.add(m);
      const start = zonedInstant(iso, m, snap.timeZone);
      const end = start + duration * 60_000;
      const booked = snap.bookings.some((b) => b.id !== exclude && isVisitService(b.type) && b.startAt < end && b.endAt > start);
      const tooSoon = start < cutoff;
      out.push({
        minute: m,
        end: m + duration,
        label: formatMinuteRange(m, m + duration, locale),
        available: !booked && !tooSoon,
        reason: tooSoon ? "notice" : booked ? "booked" : undefined,
      });
    }
  }
  return out.sort((a, b) => a.minute - b.minute);
}

/** Drop-off times for a stay starting on `iso` (inside opening hours, respecting notice). */
export function dropOffSlots(snap: AvailabilitySnapshot, iso: string, now: number, locale = "en"): Slot[] {
  const cutoff = noticeCutoff(snap, now);
  const out: Slot[] = [];
  for (const r of rangesOn(snap, iso)) {
    for (let m = r.start; m < r.end; m += SLOT_STEP_MINS) {
      if (out.some((s) => s.minute === m)) continue;
      const tooSoon = zonedInstant(iso, m, snap.timeZone) < cutoff;
      out.push({ minute: m, end: m, label: formatMinute(m, locale), available: !tooSoon, reason: tooSoon ? "notice" : undefined });
    }
  }
  return out.sort((a, b) => a.minute - b.minute);
}

export type BookingRequest = {
  type: string;
  /** visit day, or check-in / first day for stays */
  date: string;
  /** check-out (boarding) / last day (day care); ignored for visits */
  endDate?: string | null;
  /** start (visits) / drop-off (stays) minute */
  minute: number;
  durationMins?: number | null;
  /** pets in the booking — a stay needs this many free places on every night / day (default 1) */
  petCount?: number;
};

export type BookingCheck =
  | { ok: true; quantity: number; startAt: number; endAt: number; days: string[] }
  | { ok: false; error: string };

const closedMsg = (iso: string, snap: AvailabilitySnapshot, locale: string) =>
  isTimeOff(snap, iso)
    ? bookingT(locale)("availability.away", { day: formatDayLong(iso, locale) })
    : bookingT(locale)("availability.closed", { weekday: weekdayLabel(weekdayOf(iso), locale) });

/**
 * The single availability rule set. Visits: the whole slot inside opening hours, not on time off,
 * after the minimum notice, no overlap with another walk / drop-in. Stays: drop-off and pick-up on
 * open days, no time off in between (boarding), notice, and `petCount` free places (capacity minus
 * the pets of other stays) on every night / day.
 */
export function checkBooking(snap: AvailabilitySnapshot, req: BookingRequest, now: number, exclude?: string | null, locale = "en"): BookingCheck {
  const res = checkBookingIn(snap, req, now, exclude, locale);
  // French abbreviated dates end in "." ("sam. 18 oct.") — don't double the sentence's full stop.
  return res.ok ? res : { ok: false, error: res.error.replace(/\.\.$/, ".") };
}

function checkBookingIn(snap: AvailabilitySnapshot, req: BookingRequest, now: number, exclude: string | null | undefined, locale: string): BookingCheck {
  const t = bookingT(locale);
  const day = (iso: string) => formatDayLong(iso, locale);
  const tz = snap.timeZone;
  const cutoff = noticeCutoff(snap, now);
  const today = todayIn(tz, now);
  if (!isIsoDay(req.date)) return { ok: false, error: t("availability.invalidDate") };
  if (req.date < today) return { ok: false, error: t("availability.past") };

  if (!isStayService(req.type)) {
    const duration = visitMinutes(req.type, req.durationMins);
    const ranges = rangesOn(snap, req.date);
    if (!ranges.length) return { ok: false, error: closedMsg(req.date, snap, locale) };
    if (!ranges.some((r) => r.start <= req.minute && req.minute + duration <= r.end)) {
      return { ok: false, error: t("availability.outsideHours", { range: formatMinuteRange(req.minute, req.minute + duration, locale), day: day(req.date) }) };
    }
    const startAt = zonedInstant(req.date, req.minute, tz);
    const endAt = startAt + duration * 60_000;
    if (startAt < cutoff) {
      return { ok: false, error: t("availability.notice", { hours: snap.noticeHours }) };
    }
    if (snap.bookings.some((b) => b.id !== exclude && isVisitService(b.type) && b.startAt < endAt && b.endAt > startAt)) {
      return { ok: false, error: t("availability.booked", { day: day(req.date), time: formatMinute(req.minute, locale) }) };
    }
    return { ok: true, quantity: 1, startAt, endAt, days: [req.date] };
  }

  const end = req.endDate;
  if (!isIsoDay(end)) return { ok: false, error: req.type === "BOARDING" ? t("availability.chooseCheckout") : t("availability.chooseLastDay") };
  const span = daysBetween(req.date, end);
  if (req.type === "BOARDING" ? span < 1 : span < 0) {
    return { ok: false, error: req.type === "BOARDING" ? t("availability.checkoutAfter") : t("availability.lastBeforeFirst") };
  }
  if (span > MAX_STAY_DAYS) return { ok: false, error: t("availability.maxStay", { max: MAX_STAY_DAYS }) };

  if (!isOpenDay(snap, req.date)) return { ok: false, error: closedMsg(req.date, snap, locale) };
  if (!isOpenDay(snap, end)) return { ok: false, error: closedMsg(end, snap, locale) };
  const away = eachDate(req.date, end).find((d) => isTimeOff(snap, d));
  if (away) return { ok: false, error: t("availability.away", { day: day(away) }) };

  const startRanges = rangesOn(snap, req.date);
  if (!startRanges.some((r) => r.start <= req.minute && req.minute < r.end)) {
    return { ok: false, error: t("availability.dropOffOutside", { time: formatMinute(req.minute, locale), day: day(req.date) }) };
  }
  const startAt = zonedInstant(req.date, req.minute, tz);
  if (startAt < cutoff) return { ok: false, error: t("availability.noticeDropOff", { hours: snap.noticeHours }) };

  // Boarding: pick-up at the same time on check-out day. Day care: pick-up at closing on the last day.
  const days = req.type === "BOARDING" ? eachDate(req.date, addDays(end, -1)) : eachDate(req.date, end).filter((d) => isOpenDay(snap, d));
  const endAt =
    req.type === "BOARDING" ? zonedInstant(end, req.minute, tz) : zonedInstant(end, Math.max(...rangesOn(snap, end).map((r) => r.end)), tz);

  const pets = Math.max(1, req.petCount ?? 1);
  if (pets > snap.capacity) {
    return { ok: false, error: t("availability.capacity", { capacity: snap.capacity }) };
  }
  const load = stayLoad(snap, exclude);
  const full = days.filter((d) => (load.get(d) ?? 0) + pets > snap.capacity);
  if (full.length) {
    const shown = full.slice(0, 3).map(day).join(", ");
    const list = full.length > 3 ? t("availability.listMore", { list: shown, count: full.length - 3 }) : shown;
    const roomFor = Math.min(...full.map((d) => snap.capacity - (load.get(d) ?? 0)));
    return {
      ok: false,
      error: pets > 1 && roomFor > 0 ? t("availability.roomFor", { count: roomFor, list }) : t("availability.full", { list }),
    };
  }
  return { ok: true, quantity: days.length, startAt, endAt, days };
}

/** A request shifted by whole weeks (local dates, so DST never moves the wall-clock time). */
export function shiftWeeks(req: BookingRequest, weeks: number): BookingRequest {
  return { ...req, date: addDays(req.date, 7 * weeks), endDate: req.endDate ? addDays(req.endDate, 7 * weeks) : req.endDate };
}

/** Every occurrence of a weekly series (weeks = 1 for a one-off booking), each checked. */
export function checkSeries(snap: AvailabilitySnapshot, req: BookingRequest, weeks: number, now: number, locale = "en") {
  if (weeks > 1 && isStayService(req.type) && req.endDate && daysBetween(req.date, req.endDate) >= 7) {
    return [{ req, check: { ok: false as const, error: bookingT(locale)("availability.weeklyMax") } }];
  }
  return Array.from({ length: weeks }, (_, i) => {
    const r = shiftWeeks(req, i);
    return { req: r, check: checkBooking(snap, r, now, undefined, locale) };
  });
}

/** Whether a calendar day can be picked for this service (used to grey out days). Stays need `petCount` free places. */
export function isDayBookable(
  snap: AvailabilitySnapshot,
  iso: string,
  type: string,
  durationMins: number | null | undefined,
  now: number,
  petCount = 1,
) {
  if (iso < todayIn(snap.timeZone, now)) return false;
  if (!isStayService(type)) return visitSlots(snap, iso, visitMinutes(type, durationMins), now).some((s) => s.available);
  if (!isOpenDay(snap, iso)) return false;
  if ((stayLoad(snap).get(iso) ?? 0) + Math.max(1, petCount) > snap.capacity) return false;
  // the stay must still be able to start that day (notice)
  const lastRange = rangesOn(snap, iso).at(-1)!;
  return zonedInstant(iso, lastRange.end - 1, snap.timeZone) >= noticeCutoff(snap, now);
}

/** First bookable day on or after `from` (searching `maxDays` ahead). */
export function nextBookableDay(
  snap: AvailabilitySnapshot,
  from: string,
  type: string,
  durationMins: number | null | undefined,
  now: number,
  maxDays = 90,
  petCount = 1,
) {
  for (let i = 0, d = from; i < maxDays; i++, d = addDays(d, 1)) {
    if (isDayBookable(snap, d, type, durationMins, now, petCount)) return d;
  }
  return null;
}

/**
 * Search: is the sitter free for the whole range? Boarding: the stay from → to (check-out) fits.
 * Day care: every open day in the range has room. Walks / drop-ins: every day in the range has at
 * least one free slot. Stays need `petCount` free places (default 1).
 */
export function isFreeForRange(
  snap: AvailabilitySnapshot,
  from: string,
  to: string | null | undefined,
  type: string,
  durationMins: number | null | undefined,
  now: number,
  petCount = 1,
) {
  const end = to && to >= from ? to : from;
  if (type === "BOARDING") {
    const out = end > from ? end : addDays(from, 1);
    const drop = rangesOn(snap, from)
      .flatMap((r) => [r.start, Math.max(r.start, r.end - SLOT_STEP_MINS)])
      .find((m) => zonedInstant(from, m, snap.timeZone) >= noticeCutoff(snap, now));
    if (drop === undefined) return false;
    return checkBooking(snap, { type, date: from, endDate: out, minute: drop, petCount }, now).ok;
  }
  if (type === "DAY_CARE") {
    const days = eachDate(from, end);
    if (days.some((d) => isTimeOff(snap, d))) return false;
    const open = days.filter((d) => isOpenDay(snap, d));
    return open.length > 0 && open.every((d) => isDayBookable(snap, d, type, null, now, petCount));
  }
  return eachDate(from, end).every((d) => isDayBookable(snap, d, type, durationMins, now));
}
