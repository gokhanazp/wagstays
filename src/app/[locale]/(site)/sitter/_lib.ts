import { intlLocale } from "@/i18n/routing";
import type { PetSize, ServiceType } from "@/lib/constants";

export const SERVICE_ICONS: Record<string, string> = {
  DOG_WALKING: "directions_walk",
  BOARDING: "night_shelter",
  DAY_CARE: "wb_sunny",
  DROP_IN: "door_front",
};

/** `common` message key of a service label: t(serviceKey(type)) with getTranslations("common"). */
export const serviceKey = (type: string) => `enums.service.${type as ServiceType}` as const;

/** "Emily R." — owners are shown by first name + last initial in the sitter area. */
export const ownerShortName = (o: { firstName: string; lastName: string }) =>
  `${o.firstName} ${o.lastName ? `${o.lastName[0]}.` : ""}`.trim();

/** `common` message key of a pet size label. */
export const petSizeKey = (size: string) => `enums.petSize.${size as PetSize}` as const;

/** "10:00 a.m. – 11:00 a.m." style range in the city's time zone, plus the date. */
export function bookingWhen(start: Date, end: Date, tz: string, locale = "en") {
  const loc = intlLocale(locale);
  const day = new Intl.DateTimeFormat(loc, { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(start);
  const time = new Intl.DateTimeFormat(loc, { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const sameDay =
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, dateStyle: "short" }).format(start) ===
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, dateStyle: "short" }).format(end);
  if (sameDay) return `${day} · ${time.format(start)} – ${time.format(end)}`;
  const endDay = new Intl.DateTimeFormat(loc, { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(end);
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
