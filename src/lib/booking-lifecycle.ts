import "server-only";
import { db } from "./db";
import type { BookingStatus } from "./constants";

export type Actor = "OWNER" | "SITTER" | "ADMIN";

// Who may move a booking from one status to another. Admins may do anything the others can.
const RULES: Record<string, { to: BookingStatus; by: Actor[] }[]> = {
  PENDING: [
    { to: "CONFIRMED", by: ["SITTER", "ADMIN"] },
    { to: "DECLINED", by: ["SITTER", "ADMIN"] },
    { to: "CANCELLED", by: ["OWNER", "ADMIN"] },
  ],
  CONFIRMED: [
    { to: "COMPLETED", by: ["SITTER", "ADMIN"] },
    { to: "CANCELLED", by: ["OWNER", "SITTER", "ADMIN"] },
  ],
};

export function allowedTransitions(from: string, actor: Actor): BookingStatus[] {
  return (RULES[from] ?? []).filter((r) => r.by.includes(actor)).map((r) => r.to);
}

/**
 * Applies a status change with timestamps and refunds any WagPoints used when the booking
 * is declined or cancelled. Callers must already have checked that `actor` is allowed to act on
 * this booking (owner of it / its sitter / an admin). Returns an error string instead of throwing.
 */
export async function transitionBooking(opts: {
  bookingId: string;
  to: BookingStatus;
  actor: Actor;
  reason?: string | null;
  sitterNote?: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const booking = await db.booking.findUnique({ where: { id: opts.bookingId } });
  if (!booking) return { error: "Booking not found." };
  if (!allowedTransitions(booking.status, opts.actor).includes(opts.to)) {
    return { error: `A ${booking.status.toLowerCase()} booking can't be changed to ${opts.to.toLowerCase()}.` };
  }
  const now = new Date();
  const refund = (opts.to === "CANCELLED" || opts.to === "DECLINED") && booking.discountCents > 0;
  await db.$transaction([
    db.booking.update({
      where: { id: booking.id, status: booking.status }, // optimistic concurrency guard
      data: {
        status: opts.to,
        ...(opts.to === "CONFIRMED" && { confirmedAt: now }),
        ...(opts.to === "COMPLETED" && { completedAt: now }),
        ...(opts.to === "CANCELLED" && { cancelledAt: now, cancelledBy: opts.actor, cancelReason: opts.reason ?? null }),
        ...(opts.to === "DECLINED" && { cancelReason: opts.reason ?? null }),
        ...(opts.sitterNote !== undefined && { sitterNote: opts.sitterNote }),
      },
    }),
    ...(refund ? [db.user.update({ where: { id: booking.ownerId }, data: { wagPointsCents: { increment: booking.discountCents } } })] : []),
    // Sitter stats: completed bookings counter
    ...(opts.to === "COMPLETED" ? [db.sitterProfile.update({ where: { id: booking.sitterId }, data: { completedBookings: { increment: 1 } } })] : []),
  ]);
  return { ok: true };
}

/** Recomputes rating + reviewCount from imported stats plus visible review rows (create / hide / delete). */
export async function refreshSitterRating(sitterId: string) {
  const sitter = await db.sitterProfile.findUnique({ where: { id: sitterId }, select: { importedReviewCount: true, importedRating: true } });
  if (!sitter) return;
  const agg = await db.review.aggregate({ where: { sitterId, hidden: false }, _sum: { rating: true }, _count: true });
  const total = sitter.importedReviewCount + agg._count;
  const sum = sitter.importedRating * sitter.importedReviewCount + (agg._sum.rating ?? 0);
  await db.sitterProfile.update({
    where: { id: sitterId },
    data: { reviewCount: total, rating: total ? Math.round((sum / total) * 100) / 100 : 0 },
  });
}
