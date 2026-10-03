import "server-only";
import { cache } from "react";
import { db } from "./db";

export type OwnerReputation = { rating: number | null; ratingCount: number; completedStays: number };

/**
 * Aggregate reputation of a pet parent, as shown to sitters: average of non-hidden OwnerReviews and the number of
 * completed bookings with any WagStays sitter. Never exposes individual private notes.
 */
export const getOwnerReputation = cache(async (ownerId: string): Promise<OwnerReputation> => {
  const [agg, completedStays] = await Promise.all([
    db.ownerReview.aggregate({ where: { ownerId, hidden: false }, _avg: { rating: true }, _count: true }),
    db.booking.count({ where: { ownerId, status: "COMPLETED" } }),
  ]);
  return { rating: agg._count ? agg._avg.rating : null, ratingCount: agg._count, completedStays };
});
