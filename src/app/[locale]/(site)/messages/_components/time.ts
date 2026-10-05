// Date helpers for messaging. All formatting is pinned to an explicit time zone so server and client agree.

export const DEFAULT_TZ = "America/Toronto";

export function dayKey(d: Date, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function clockTime(d: Date, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(d);
}

/** "Today", "Yesterday", "Wednesday, September 30" (+ year when not the current year). */
export function dayLabel(d: Date, tz = DEFAULT_TZ, now = new Date()) {
  const k = dayKey(d, tz);
  if (k === dayKey(now, tz)) return "Today";
  if (k === dayKey(new Date(now.getTime() - 86_400_000), tz)) return "Yesterday";
  const sameYear = k.slice(0, 4) === dayKey(now, tz).slice(0, 4);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, weekday: "long", month: "long", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) }).format(d);
}

/** Compact relative time for the inbox list: "now", "5m", "3h", "Yesterday", "Mon", "Sep 12". */
export function shortRelative(d: Date, tz = DEFAULT_TZ, now = new Date()) {
  const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (dayKey(d, tz) === dayKey(now, tz)) return `${Math.floor(mins / 60)}h`;
  if (dayKey(d, tz) === dayKey(new Date(now.getTime() - 86_400_000), tz)) return "Yesterday";
  if (mins < 6 * 24 * 60) return new Intl.DateTimeFormat("en-CA", { timeZone: tz, weekday: "short" }).format(d);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, month: "short", day: "numeric" }).format(d);
}
