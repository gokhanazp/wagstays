import "server-only";
import { db } from "@/lib/db";
import { loadBooking, sendBookingEmail, type BookingMailKind, type Group, type MailBooking } from "@/lib/email/templates/booking";
import type { DomainEvent, EventHandler } from "./index";

// Booking emails for domain events (rendering lives in src/lib/email/templates/booking.ts; the day-before
// reminders and response nudges are sent by /api/cron/booking-reminders).
//
// Weekly series: booking.created is emitted once (first occurrence) and describes the whole series. Series
// actions ("accept all", "cancel this and later") emit one event per occurrence; those are folded into one
// email sent by the earliest occurrence changed in the same action (see transitionGroup).

const memberSelect = { id: true, startAt: true, subtotalCents: true, totalCents: true, discountCents: true } as const;

/** Occurrences changed together by one series action are stamped within this window of each other. */
const SAME_ACTION_MS = 2 * 60_000;

const STAMP = { CONFIRMED: "confirmedAt", DECLINED: "updatedAt", CANCELLED: "cancelledAt", COMPLETED: "completedAt" } as const;

/** The occurrences this event's email should describe, or null if another occurrence's event sends it. */
async function transitionGroup(b: MailBooking, status: keyof typeof STAMP): Promise<Group | null> {
  if (b.status !== status) return null; // changed again since the event — stale
  const self = { id: b.id, startAt: b.startAt, subtotalCents: b.subtotalCents, totalCents: b.totalCents, discountCents: b.discountCents };
  if (!b.seriesId) return { lead: b, members: [self] };
  const field = STAMP[status];
  const mine = b[field]?.getTime();
  if (mine == null) return { lead: b, members: [self] };
  const siblings = await db.booking.findMany({
    where: { seriesId: b.seriesId, status },
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    select: { ...memberSelect, confirmedAt: true, cancelledAt: true, completedAt: true, updatedAt: true },
  });
  const members = siblings.filter((s) => {
    const at = s[field]?.getTime();
    return at != null && Math.abs(at - mine) <= SAME_ACTION_MS;
  });
  if (!members.length || members[0].id !== b.id) return null;
  return { lead: b, members: members.map(({ id, startAt, subtotalCents, totalCents, discountCents }) => ({ id, startAt, subtotalCents, totalCents, discountCents })) };
}

/** WagPoints returned to the owner for these occurrences (only when the ledger says so). */
async function refundedPoints(g: Group) {
  const agg = await db.wagPointsEntry.aggregate({
    where: { bookingId: { in: g.members.map((m) => m.id) }, reason: "BOOKING_REFUND", amountCents: { gt: 0 } },
    _sum: { amountCents: true },
  });
  return agg._sum.amountCents ?? 0;
}

/** For per-occurrence emails we only want once per series (e.g. the review request after each weekly walk). */
async function sentForSeries(kind: BookingMailKind, b: MailBooking) {
  if (!b.seriesId) return false;
  const ids = (await db.booking.findMany({ where: { seriesId: b.seriesId }, select: { id: true } })).map((x) => x.id);
  const hit = await db.emailLog.findFirst({ where: { kind, status: { in: ["sent", "dev"] }, bookingId: { in: ids } }, select: { id: true } });
  return !!hit;
}

async function handle(event: DomainEvent) {
  if (!("bookingId" in event) || event.type === "review.created") return;
  const b = await loadBooking(event.bookingId);
  if (!b) return;

  switch (event.type) {
    case "booking.created": {
      const members = b.seriesId
        ? await db.booking.findMany({ where: { seriesId: b.seriesId }, orderBy: [{ startAt: "asc" }, { id: "asc" }], select: memberSelect })
        : [b];
      await sendBookingEmail("booking.request", { lead: b, members });
      return;
    }
    case "booking.confirmed": {
      const g = await transitionGroup(b, "CONFIRMED");
      if (g) await sendBookingEmail("booking.confirmed", g);
      return;
    }
    case "booking.declined": {
      const g = await transitionGroup(b, "DECLINED");
      if (g) await sendBookingEmail("booking.declined", g, { pointsCents: await refundedPoints(g) });
      return;
    }
    case "booking.cancelled": {
      const g = await transitionGroup(b, "CANCELLED");
      if (!g) return;
      const pointsCents = await refundedPoints(g);
      if (event.actor !== "OWNER") await sendBookingEmail("booking.cancelled.owner", g, { pointsCents, actor: event.actor });
      if (event.actor !== "SITTER") await sendBookingEmail("booking.cancelled.sitter", g, { actor: event.actor });
      return;
    }
    case "booking.completed": {
      const g = await transitionGroup(b, "COMPLETED");
      if (!g) return;
      const review = await db.review.findUnique({ where: { bookingId: b.id }, select: { id: true } });
      if (!review && !(await sentForSeries("booking.completed.owner", b))) await sendBookingEmail("booking.completed.owner", g);
      if (!(await sentForSeries("booking.completed.sitter", b))) await sendBookingEmail("booking.completed.sitter", g);
      return;
    }
  }
}

export const email_bookingHandlers: EventHandler[] = [handle];
