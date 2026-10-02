import { PET_SIZE_LABELS, SERVICE_LABELS, type PetSize, type ServiceType } from "@/lib/constants";

export const SERVICE_ICONS: Record<string, string> = {
  DOG_WALKING: "directions_walk",
  BOARDING: "night_shelter",
  DAY_CARE: "wb_sunny",
  DROP_IN: "door_front",
};

export const serviceLabel = (type: string) => SERVICE_LABELS[type as ServiceType] ?? type;

/** "Emily R." — owners are shown by first name + last initial in the sitter area. */
export const ownerShortName = (o: { firstName: string; lastName: string }) =>
  `${o.firstName} ${o.lastName ? `${o.lastName[0]}.` : ""}`.trim();

export const petSizeLabel = (size: string | null) => (size ? PET_SIZE_LABELS[size as PetSize]?.label ?? size : null);

/** "10:00 a.m. – 11:00 a.m." style range in the city's time zone, plus the date. */
export function bookingWhen(start: Date, end: Date, tz: string) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(start);
  const time = new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const sameDay =
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, dateStyle: "short" }).format(start) ===
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, dateStyle: "short" }).format(end);
  if (sameDay) return `${day} · ${time.format(start)} – ${time.format(end)}`;
  const endDay = new Intl.DateTimeFormat("en-CA", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(end);
  return `${day}, ${time.format(start)} → ${endDay}, ${time.format(end)}`;
}

/** First instant of the current month in `tz`, as a UTC Date. */
export function startOfMonthInZone(tz: string, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit" }).formatToParts(now).map((p) => [p.type, p.value]),
  );
  const guess = Date.UTC(+parts.year, +parts.month - 1, 1);
  // offset of tz at that moment
  const local = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(guess))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+local.year, +local.month - 1, +local.day, +local.hour, +local.minute);
  return new Date(guess - (asUtc - guess));
}

/** Whether a booking's start time has passed (server render time). */
export const hasStarted = (start: Date) => start.getTime() <= Date.now();
