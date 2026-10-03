// Helpers for the admin dashboard, cities, settings, users and audit screens.

export const CANADIAN_TIME_ZONES = [
  { value: "America/St_Johns", label: "Newfoundland (St. John's)" },
  { value: "America/Halifax", label: "Atlantic (Halifax)" },
  { value: "America/Moncton", label: "Atlantic (Moncton)" },
  { value: "America/Toronto", label: "Eastern (Toronto)" },
  { value: "America/Winnipeg", label: "Central (Winnipeg)" },
  { value: "America/Regina", label: "Saskatchewan (Regina)" },
  { value: "America/Edmonton", label: "Mountain (Edmonton)" },
  { value: "America/Vancouver", label: "Pacific (Vancouver)" },
  { value: "America/Whitehorse", label: "Yukon (Whitehorse)" },
] as const;

export const AUDIT_ENTITY_TYPES = ["City", "Neighbourhood", "SitterApplication", "SitterProfile", "Booking", "User", "Review", "OwnerReview", "SupportTicket", "PlatformSettings"] as const;

/** Admin URL for an audited entity, when one exists. */
export function auditEntityHref(entityType: string, entityId: string, details?: unknown): string | null {
  switch (entityType) {
    case "City":
      return `/admin/cities/${entityId}`;
    case "Neighbourhood": {
      const cityId = (details as { cityId?: string } | null)?.cityId;
      return cityId ? `/admin/cities/${cityId}` : null;
    }
    case "User":
      return `/admin/users/${entityId}`;
    case "SitterApplication":
      return `/admin/applications/${entityId}`;
    case "SitterProfile":
      return `/admin/sitters/${entityId}`;
    case "Booking":
      return `/admin/bookings/${entityId}`;
    case "Review":
      return `/admin/reviews`;
    case "OwnerReview":
      return `/admin/reviews?tab=owners`;
    case "PlatformSettings":
      return `/admin/settings`;
    case "SupportTicket":
      return `/admin/support/${entityId}`;
    default:
      return null;
  }
}

export function kebab(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Offset (ms) of `tz` from UTC at instant `d`. */
function tzOffsetMs(d: Date, tz: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(d.getTime() / 1000) * 1000;
}

/** Calendar date (YYYY-MM-DD) of instant `d` in `tz`. */
export function zonedIsoDate(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** UTC instant of local midnight for the given local calendar date in `tz`. */
export function zonedMidnight(y: number, m: number, day: number, tz: string) {
  const guess = new Date(Date.UTC(y, m, day));
  const first = guess.getTime() - tzOffsetMs(guess, tz);
  return new Date(guess.getTime() - tzOffsetMs(new Date(first), tz));
}

export function startOfMonthInZone(now: Date, tz: string) {
  const [y, m] = zonedIsoDate(now, tz).split("-").map(Number);
  return zonedMidnight(y, m - 1, 1, tz);
}

/** Last `days` local calendar days (oldest first), each with its UTC start. */
export function lastDaysInZone(now: Date, tz: string, days: number) {
  const [y, m, d] = zonedIsoDate(now, tz).split("-").map(Number);
  return Array.from({ length: days }, (_, i) => {
    const start = zonedMidnight(y, m - 1, d - (days - 1 - i), tz);
    return { iso: zonedIsoDate(new Date(start.getTime() + 12 * 3600_000), tz), start };
  });
}
