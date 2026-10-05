import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { DEFAULT_TIME_ZONE } from "./constants";
import {
  addDays,
  checkBooking,
  isFreeForRange,
  isOpenDay,
  isStayService,
  isTimeOff,
  isVisitService,
  rangesOn,
  stayLoad,
  todayIn,
  visitMinutes,
  visitSlots,
  zonedInstant,
  zonedParts,
  type AvailabilitySnapshot,
  type BookingCheck,
} from "./availability-core";

// Server side of the availability rules (see availability-core.ts for the rules themselves).
// Every booking write re-validates through `isSlotAvailable` / `checkBooking` on a fresh snapshot.

type Client = Prisma.TransactionClient | typeof db;

export const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED"];

/**
 * Loads availability snapshots for several sitters at once, covering local dates `fromDate`…`toDate`
 * (bookings are loaded with a few days of padding so multi-day stays starting earlier are counted).
 */
export async function loadSnapshots(sitterIds: string[], fromDate: string, toDate: string, client: Client = db) {
  const ids = [...new Set(sitterIds)];
  const out = new Map<string, AvailabilitySnapshot>();
  if (!ids.length) return out;
  const [profiles, hours, timeOff, bookings] = await Promise.all([
    client.sitterProfile.findMany({
      where: { id: { in: ids } },
      select: { id: true, boardingCapacity: true, noticeHours: true, city: { select: { timeZone: true } } },
    }),
    client.sitterAvailability.findMany({
      where: { sitterId: { in: ids } },
      select: { sitterId: true, weekday: true, startMinute: true, endMinute: true },
    }),
    client.sitterTimeOff.findMany({
      where: { sitterId: { in: ids }, endDate: { gte: fromDate }, startDate: { lte: toDate } },
      select: { id: true, sitterId: true, startDate: true, endDate: true, note: true },
      orderBy: { startDate: "asc" },
    }),
    client.booking.findMany({
      where: {
        sitterId: { in: ids },
        status: { in: ACTIVE_BOOKING_STATUSES },
        startAt: { lt: new Date(zonedInstant(addDays(toDate, 2), 0, DEFAULT_TIME_ZONE)) },
        endAt: { gt: new Date(zonedInstant(addDays(fromDate, -1), 0, DEFAULT_TIME_ZONE)) },
      },
      select: { id: true, sitterId: true, startAt: true, endAt: true, petCount: true, service: { select: { type: true } } },
    }),
  ]);
  for (const p of profiles) {
    out.set(p.id, {
      timeZone: p.city.timeZone || DEFAULT_TIME_ZONE,
      noticeHours: p.noticeHours,
      capacity: Math.max(1, p.boardingCapacity),
      hours: hours.filter((h) => h.sitterId === p.id).map(({ weekday, startMinute, endMinute }) => ({ weekday, startMinute, endMinute })),
      timeOff: timeOff.filter((t) => t.sitterId === p.id).map(({ id, startDate, endDate, note }) => ({ id, startDate, endDate, note })),
      bookings: bookings
        .filter((b) => b.sitterId === p.id)
        .map((b) => ({ id: b.id, type: b.service.type, startAt: b.startAt.getTime(), endAt: b.endAt.getTime(), petCount: b.petCount })),
    });
  }
  return out;
}

export async function loadSnapshot(sitterId: string, fromDate: string, toDate: string, client: Client = db) {
  return (await loadSnapshots([sitterId], fromDate, toDate, client)).get(sitterId) ?? null;
}

/** Client-safe copy of a snapshot (booking ids stripped) for the profile widget. */
export function publicSnapshot(snap: AvailabilitySnapshot): AvailabilitySnapshot {
  return { ...snap, timeOff: snap.timeOff.map(({ startDate, endDate }) => ({ startDate, endDate })), bookings: snap.bookings.map((b, i) => ({ ...b, id: `b${i}` })) };
}

export type DayStatus = "open" | "closed" | "timeoff" | "booked" | "full";

/** Day-by-day availability of a sitter (sitter calendar preview, admin views). */
export async function getSitterAvailability(sitterId: string, fromDate: string, toDate: string) {
  const snap = await loadSnapshot(sitterId, fromDate, toDate);
  if (!snap) return null;
  const load = stayLoad(snap);
  const days = [];
  for (let d = fromDate; d <= toDate; d = addDays(d, 1)) {
    const visits = snap.bookings.filter((b) => isVisitService(b.type) && zonedParts(b.startAt, snap.timeZone).iso === d).length;
    const stays = load.get(d) ?? 0;
    const open = isOpenDay(snap, d);
    const status: DayStatus = isTimeOff(snap, d) ? "timeoff" : !open ? "closed" : stays >= snap.capacity ? "full" : visits || stays ? "booked" : "open";
    days.push({ date: d, status, ranges: rangesOn(snap, d), visits, stays });
  }
  return { snapshot: snap, days };
}

/**
 * Whether a booking for `service` from `startAt` to `endAt` fits the sitter's availability.
 * Pass `excludeBookingId` when re-checking an existing booking. Use `client` inside a transaction.
 */
export async function isSlotAvailable(
  opts: {
    sitterId: string;
    service: string | { type: string; durationMins?: number | null };
    startAt: Date;
    endAt: Date;
    excludeBookingId?: string | null;
    /** places the booking needs (stays); default 1 */
    petCount?: number;
  },
  client: Client = db,
): Promise<BookingCheck> {
  const type = typeof opts.service === "string" ? opts.service : opts.service.type;
  const probe = await client.sitterProfile.findUnique({ where: { id: opts.sitterId }, select: { city: { select: { timeZone: true } } } });
  if (!probe) return { ok: false, error: "Sitter not found." };
  const tz = probe.city.timeZone || DEFAULT_TIME_ZONE;
  const s = zonedParts(opts.startAt.getTime(), tz);
  const e = zonedParts(opts.endAt.getTime(), tz);
  const snap = await loadSnapshot(opts.sitterId, s.iso, e.iso, client);
  if (!snap) return { ok: false, error: "Sitter not found." };
  return checkBooking(
    snap,
    {
      type,
      date: s.iso,
      endDate: e.iso,
      minute: s.minute,
      durationMins: isStayService(type) ? null : Math.round((opts.endAt.getTime() - opts.startAt.getTime()) / 60_000),
      petCount: opts.petCount,
    },
    Date.now(),
    opts.excludeBookingId,
  );
}

/** Free start times for a walk / drop-in on a local date. */
export async function availableSlotsForDate(sitterId: string, date: string, serviceType: string, durationMins?: number | null) {
  const snap = await loadSnapshot(sitterId, date, date);
  if (!snap) return [];
  return visitSlots(snap, date, visitMinutes(serviceType, durationMins), Date.now());
}

/** Search helper: is the sitter free for the range (any active service when `serviceType` is omitted)? */
export async function isSitterFreeForRange(sitterId: string, from: string, to: string | null | undefined, serviceType?: string, petCount = 1) {
  return (await freeSittersForRange([sitterId], from, to, serviceType, petCount)).has(sitterId);
}

/** Batch version used by search: ids of the sitters free for the range (stays need `petCount` free places). */
export async function freeSittersForRange(sitterIds: string[], from: string, to: string | null | undefined, serviceType?: string, petCount = 1) {
  const end = to && to >= from ? to : from;
  const [snaps, services] = await Promise.all([
    loadSnapshots(sitterIds, from, end > from ? end : addDays(from, 1)),
    db.service.findMany({
      where: { sitterId: { in: sitterIds }, active: true, ...(serviceType && { type: serviceType }) },
      select: { sitterId: true, type: true, durationMins: true },
    }),
  ]);
  const now = Date.now();
  const free = new Set<string>();
  for (const [id, snap] of snaps) {
    if (from < todayIn(snap.timeZone, now)) continue;
    if (services.some((s) => s.sitterId === id && isFreeForRange(snap, from, end, s.type, s.durationMins, now, petCount))) free.add(id);
  }
  return free;
}
