import "server-only";
import { db } from "./db";

export type SeriesPosition = { index: number; total: number };

/** "Week 2 of 6" positions for bookings that belong to a weekly series (keyed by booking id). */
export async function seriesPositions(bookings: { id: string; seriesId: string | null }[]) {
  const ids = [...new Set(bookings.map((b) => b.seriesId).filter((s): s is string => !!s))];
  const out = new Map<string, SeriesPosition>();
  if (!ids.length) return out;
  const rows = await db.booking.findMany({
    where: { seriesId: { in: ids } },
    select: { id: true, seriesId: true },
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
  });
  for (const sid of ids) {
    const members = rows.filter((r) => r.seriesId === sid);
    members.forEach((m, i) => out.set(m.id, { index: i + 1, total: members.length }));
  }
  return out;
}

export const seriesLabel = (p: SeriesPosition | undefined) => (p ? `Week ${p.index} of ${p.total}` : null);

/** All occurrences of a series, in order (for detail pages). */
export function seriesMembers(seriesId: string) {
  return db.booking.findMany({
    where: { seriesId },
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    select: { id: true, startAt: true, endAt: true, status: true, totalCents: true, subtotalCents: true },
  });
}
