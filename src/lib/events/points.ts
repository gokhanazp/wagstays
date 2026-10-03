import "server-only";
import { db } from "../db";
import { changePoints } from "../wagpoints";
import { getPlatformSettings } from "../settings";
import { ensureReferralCode, pointsForSubtotal } from "../referrals";
import type { DomainEvent, EventHandler } from "./index";

// WagPoints earning & referral rewards.
// Every handler is idempotent: it checks the ledger inside a transaction holding a per-key advisory lock,
// so a duplicated event (or two concurrent ones) can never pay twice.

const lock = (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0], key: string) =>
  tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;

/** Owner earns pointsEarnRateBps of the booking subtotal, once per booking. */
async function earnForBooking(bookingId: string) {
  const booking = await db.booking.findUnique({ where: { id: bookingId }, select: { id: true, ownerId: true, status: true, subtotalCents: true } });
  if (!booking || booking.status !== "COMPLETED") return;
  const { pointsEarnRateBps } = await getPlatformSettings();
  const amount = pointsForSubtotal(booking.subtotalCents, pointsEarnRateBps);
  if (amount <= 0) return;
  await db.$transaction(async (tx) => {
    await lock(tx, `points:earn:${booking.id}`);
    const already = await tx.wagPointsEntry.findFirst({ where: { bookingId: booking.id, reason: "BOOKING_EARN" }, select: { id: true } });
    if (already) return;
    await changePoints(tx, { userId: booking.ownerId, amountCents: amount, reason: "BOOKING_EARN", bookingId: booking.id, note: "Earned on a completed booking" });
  });
}

/**
 * When a referred user's first booking is completed, the referrer and the friend each get referralRewardCents.
 * Both ledger rows carry the qualifying booking id, so "already rewarded" = any REFERRAL entry on one of the friend's bookings.
 */
async function rewardReferral(bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true, owner: { select: { id: true, firstName: true, referredById: true, referredBy: { select: { id: true, firstName: true, deletedAt: true } } } } },
  });
  if (!booking || booking.status !== "COMPLETED") return;
  const friend = booking.owner;
  const referrer = friend.referredBy;
  if (!referrer || referrer.id === friend.id || referrer.deletedAt) return;

  const { referralRewardCents } = await getPlatformSettings();
  if (referralRewardCents <= 0) return;

  await db.$transaction(async (tx) => {
    await lock(tx, `points:referral:${friend.id}`);
    // Only the friend's FIRST completed booking qualifies.
    const earlier = await tx.booking.count({ where: { ownerId: friend.id, status: "COMPLETED", id: { not: booking.id } } });
    if (earlier > 0) return;
    const rewarded = await tx.wagPointsEntry.findFirst({ where: { reason: "REFERRAL", booking: { ownerId: friend.id } }, select: { id: true } });
    if (rewarded) return;
    await changePoints(tx, { userId: referrer.id, amountCents: referralRewardCents, reason: "REFERRAL", bookingId: booking.id, note: `Referral: ${friend.firstName}` });
    await changePoints(tx, { userId: friend.id, amountCents: referralRewardCents, reason: "REFERRAL", bookingId: booking.id, note: `Referral: ${referrer.firstName}` });
  });
}

// Separate handlers so a failure in one never skips the others (events/index.ts runs each in its own try).
export const pointsHandlers: EventHandler[] = [
  async (e: DomainEvent) => {
    if (e.type === "booking.completed") await earnForBooking(e.bookingId);
  },
  async (e: DomainEvent) => {
    if (e.type === "booking.completed") await rewardReferral(e.bookingId);
  },
  async (e: DomainEvent) => {
    if (e.type === "user.signedUp") await ensureReferralCode(e.userId);
  },
];
