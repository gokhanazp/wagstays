import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";

type Client = PrismaClient | Prisma.TransactionClient;

export type PointsReason = "BOOKING_EARN" | "BOOKING_SPEND" | "BOOKING_REFUND" | "REFERRAL" | "ADMIN" | "WELCOME";

/**
 * The only way to change a WagPoints balance: updates User.wagPointsCents and writes a ledger entry.
 * Spending (negative amounts) is guarded so the balance never goes below zero — returns false if it would.
 * Pass a transaction client to make it part of a larger transaction.
 */
export async function changePoints(
  client: Client,
  opts: { userId: string; amountCents: number; reason: PointsReason; note?: string | null; bookingId?: string | null },
): Promise<boolean> {
  if (opts.amountCents === 0) return true;
  const res = await client.user.updateMany({
    where: { id: opts.userId, ...(opts.amountCents < 0 && { wagPointsCents: { gte: -opts.amountCents } }) },
    data: { wagPointsCents: { increment: opts.amountCents } },
  });
  if (res.count !== 1) return false;
  await client.wagPointsEntry.create({
    data: { userId: opts.userId, amountCents: opts.amountCents, reason: opts.reason, note: opts.note ?? null, bookingId: opts.bookingId ?? null },
  });
  return true;
}
