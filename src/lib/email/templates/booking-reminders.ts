import "server-only";
import { db } from "@/lib/db";
import { addDays, todayIn, zonedParts } from "@/lib/availability-core";
import { bookingSelect, sendBookingEmail, type Group } from "./booking";

// Daily booking emails, run by /api/cron/booking-reminders (vercel.json, 22:00 UTC ≈ 6 pm in Toronto):
//  (a) day-before reminders for CONFIRMED bookings starting tomorrow in the sitter's city time zone;
//  (b) one nudge to the sitter for requests still PENDING 20 hours after they were made.
// Both are safe to re-run: sendBookingEmail skips anything already sent (EmailLog) for that booking + recipient.

export const NUDGE_AFTER_MS = 20 * 3_600_000;

/** CONFIRMED bookings whose first day is tomorrow, local to the booking's city. */
export async function selectDayBeforeReminders(now = new Date()) {
  const rows = await db.booking.findMany({
    where: { status: "CONFIRMED", startAt: { gt: now, lt: new Date(now.getTime() + 50 * 3_600_000) } },
    orderBy: { startAt: "asc" },
    select: bookingSelect,
  });
  return rows.filter((b) => {
    const tz = b.sitter.city.timeZone;
    return zonedParts(b.startAt.getTime(), tz).iso === addDays(todayIn(tz, now.getTime()), 1);
  });
}

/**
 * Requests still PENDING more than 20 hours after they were made (and not yet started) that haven't been
 * nudged. A weekly series gets one nudge, carried by its earliest pending occurrence.
 */
export async function selectResponseNudges(now = new Date()): Promise<Group[]> {
  const rows = await db.booking.findMany({
    where: { status: "PENDING", createdAt: { lte: new Date(now.getTime() - NUDGE_AFTER_MS) }, startAt: { gt: now } },
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    select: bookingSelect,
  });
  const groups = new Map<string, Group>();
  for (const b of rows) {
    const key = b.seriesId ?? b.id;
    const g = groups.get(key);
    if (g) g.members.push(b);
    else groups.set(key, { lead: b, members: [b] });
  }
  // Already nudged (any occurrence of the series, in case the earliest one changed since)?
  const seriesIds = rows.map((b) => b.seriesId).filter((s): s is string => !!s);
  const seriesRows = seriesIds.length ? await db.booking.findMany({ where: { seriesId: { in: seriesIds } }, select: { id: true, seriesId: true } }) : [];
  const sent = await db.emailLog.findMany({
    where: { kind: "booking.request.nudge", status: { in: ["sent", "dev"] }, bookingId: { in: [...rows.map((b) => b.id), ...seriesRows.map((r) => r.id)] } },
    select: { bookingId: true },
  });
  const nudged = new Set(sent.map((s) => s.bookingId));
  const nudgedSeries = new Set(seriesRows.filter((r) => nudged.has(r.id)).map((r) => r.seriesId));
  return [...groups.values()].filter((g) => !nudged.has(g.lead.id) && !(g.lead.seriesId && nudgedSeries.has(g.lead.seriesId)));
}

type Counts = Record<string, number>;
const bump = (c: Counts, k: string) => void (c[k] = (c[k] ?? 0) + 1);

/**
 * Runs both jobs and returns counts per outcome (sent / dev / skipped / optedOut / duplicate / …).
 * `only` limits the run to these booking ids (test scripts against a shared database).
 */
export async function runBookingReminders(now = new Date(), only?: string[]) {
  const keep = (id: string) => !only || only.includes(id);
  const reminders: Counts = { bookings: 0 };
  for (const b of (await selectDayBeforeReminders(now)).filter((b) => keep(b.id))) {
    reminders.bookings++;
    const g: Group = { lead: b, members: [b] };
    bump(reminders, `owner.${await sendBookingEmail("reminder.owner", g)}`);
    bump(reminders, `sitter.${await sendBookingEmail("reminder.sitter", g)}`);
  }
  const nudges: Counts = { requests: 0 };
  for (const g of (await selectResponseNudges(now)).filter((g) => keep(g.lead.id))) {
    nudges.requests++;
    bump(nudges, await sendBookingEmail("booking.request.nudge", g));
  }
  return { reminders, nudges };
}
