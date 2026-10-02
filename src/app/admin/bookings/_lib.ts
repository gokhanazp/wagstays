import "server-only";
import type { Prisma } from "@prisma/client";
import { BOOKING_STATUSES, SERVICE_TYPES, type BookingStatus, type ServiceType } from "@/lib/constants";
import { isIsoDate, zonedDateTime } from "@/lib/booking-time";
import { db } from "@/lib/db";

export const PAGE_SIZE = 20;

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export type BookingFilters = {
  status?: BookingStatus;
  service?: ServiceType;
  sitter?: string;
  q?: string;
  from?: string;
  to?: string;
  sort: "upcoming" | "newest";
  page: number;
};

/** Parses /admin/bookings search params; unknown values are ignored rather than trusted. */
export function parseBookingFilters(sp: SP): BookingFilters {
  const status = one(sp.status);
  const service = one(sp.service);
  const from = one(sp.from);
  const to = one(sp.to);
  const page = Number.parseInt(one(sp.page) ?? "1", 10);
  return {
    status: BOOKING_STATUSES.includes(status as BookingStatus) ? (status as BookingStatus) : undefined,
    service: SERVICE_TYPES.includes(service as ServiceType) ? (service as ServiceType) : undefined,
    sitter: one(sp.sitter)?.slice(0, 40),
    q: one(sp.q)?.slice(0, 80),
    from: isIsoDate(from) ? from : undefined,
    to: isIsoDate(to) ? to : undefined,
    sort: one(sp.sort) === "newest" ? "newest" : "upcoming",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Where clause for everything except status (status counts are computed on top of this). */
export function baseWhere(f: BookingFilters): Prisma.BookingWhereInput {
  const and: Prisma.BookingWhereInput[] = [];
  if (f.service) and.push({ service: { type: f.service } });
  if (f.sitter) and.push({ sitterId: f.sitter });
  if (f.q) {
    const words = f.q.split(/\s+/).filter(Boolean).slice(0, 4);
    for (const w of words) {
      and.push({ owner: { OR: [{ firstName: { contains: w, mode: "insensitive" } }, { lastName: { contains: w, mode: "insensitive" } }, { email: { contains: w, mode: "insensitive" } }] } });
    }
  }
  if (f.from || f.to) {
    and.push({
      startAt: {
        ...(f.from && { gte: zonedDateTime(f.from, "00:00") }),
        // inclusive end date: everything before midnight of the following day
        ...(f.to && { lt: endOfDay(f.to) }),
      },
    });
  }
  return and.length ? { AND: and } : {};
}

function endOfDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return zonedDateTime(next, "00:00");
}

export function bookingWhere(f: BookingFilters): Prisma.BookingWhereInput {
  const base = baseWhere(f);
  return f.status ? { AND: [base, { status: f.status }] } : base;
}

export const bookingListInclude = {
  owner: { select: { id: true, firstName: true, lastName: true, email: true } },
  pet: { select: { name: true, species: true, breed: true } },
  sitter: { select: { id: true, displayName: true, slug: true, city: { select: { timeZone: true } } } },
  service: { select: { type: true } },
} satisfies Prisma.BookingInclude;

/**
 * Bookings for a filter, paginated. "Upcoming first" lists bookings that haven't started yet
 * (soonest first) followed by past ones (most recent first); "newest" orders by creation date.
 * Omit `take` to get every row (CSV export).
 */
export async function findBookings(f: BookingFilters, opts: { skip?: number; take?: number } = {}) {
  const where = bookingWhere(f);
  const skip = opts.skip ?? 0;
  const take = opts.take;
  if (f.sort === "newest") {
    return db.booking.findMany({ where, include: bookingListInclude, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip, take });
  }
  const now = new Date();
  const upWhere: Prisma.BookingWhereInput = { AND: [where, { startAt: { gte: now } }] };
  const pastWhere: Prisma.BookingWhereInput = { AND: [where, { startAt: { lt: now } }] };
  const upcomingCount = await db.booking.count({ where: upWhere });
  const upcoming =
    skip < upcomingCount
      ? await db.booking.findMany({ where: upWhere, include: bookingListInclude, orderBy: [{ startAt: "asc" }, { id: "asc" }], skip, take })
      : [];
  const remaining = take === undefined ? undefined : take - upcoming.length;
  if (remaining === 0) return upcoming;
  const past = await db.booking.findMany({
    where: pastWhere,
    include: bookingListInclude,
    orderBy: [{ startAt: "desc" }, { id: "asc" }],
    skip: Math.max(skip - upcomingCount, 0),
    take: remaining,
  });
  return [...upcoming, ...past];
}

/** Query string for the current filters with overrides (undefined/"" removes a key). */
export function filterHref(f: BookingFilters, overrides: Partial<Record<keyof BookingFilters, string | number | undefined>> = {}, path = "/admin/bookings") {
  const qs = new URLSearchParams();
  const merged: Record<string, string | number | undefined> = {
    status: f.status,
    service: f.service,
    sitter: f.sitter,
    q: f.q,
    from: f.from,
    to: f.to,
    sort: f.sort === "upcoming" ? undefined : f.sort,
    page: f.page > 1 ? f.page : undefined,
    ...overrides,
  };
  for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "page" && Number(v) <= 1)) qs.set(k, String(v));
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

export const shortRef = (id: string) => `WS-${id.slice(-6).toUpperCase()}`;
