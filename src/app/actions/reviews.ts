"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminOrNull, requireSitter } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canEditReply, composeOwnerNote, OWNER_NOTE_MAX, OWNER_REVIEW_TAGS, REPLY_EDIT_WINDOW_MS, REPLY_MAX } from "@/lib/review-rules";
import type { SitterActionState } from "./sitter";
import type { AdminActionState } from "./admin-bookings";

// Two-way reviews.
//  • Sitters reply (publicly) to reviews on their own profile, and privately rate pet parents after a COMPLETED booking.
//  • Admins moderate owner ratings (hide / unhide) and can remove sitter replies. Every admin change is audited.
// Ids posted by the client are never trusted on their own: every query is scoped to the signed-in sitter's profile.

const id = z.string().trim().min(1).max(64);

function firstError(err: z.ZodError) {
  const fieldErrors = z.flattenError(err).fieldErrors as Record<string, string[] | undefined>;
  return { error: Object.values(fieldErrors).flat()[0] ?? "Please check the form.", fieldErrors };
}

function revalidateReviewPages(slug: string, bookingId?: string | null) {
  revalidatePath("/sitter", "layout");
  revalidatePath(`/sitters/${slug}`);
  revalidatePath("/admin/reviews");
  if (bookingId) revalidatePath(`/admin/bookings/${bookingId}`);
}

/* ─────────────────────────── Sitter: reply to a review ─────────────────────────── */

const ReplySchema = z.object({
  reviewId: id,
  body: z
    .string()
    .trim()
    .min(1, "Please write a reply.")
    .max(REPLY_MAX, `Please keep your reply under ${REPLY_MAX} characters.`),
});

/** Post (once) or edit (within 7 days) the sitter's public reply to a review of their profile. */
export async function replyToReview(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const parsed = ReplySchema.safeParse({ reviewId: formData.get("reviewId"), body: formData.get("body") ?? "" });
  if (!parsed.success) return firstError(parsed.error);
  const { reviewId, body } = parsed.data;

  const review = await db.review.findFirst({
    where: { id: reviewId, sitterId: profile.id },
    select: { id: true, hidden: true, sitterReply: true, sitterRepliedAt: true, bookingId: true },
  });
  if (!review) return { error: "We couldn't find that review." };
  if (review.hidden) return { error: "This review has been hidden by WagStays, so it can't be replied to." };

  if (review.sitterReply) {
    if (!canEditReply(review.sitterRepliedAt)) {
      return { error: `Replies can only be edited within ${REPLY_EDIT_WINDOW_MS / 86_400_000} days of posting.` };
    }
    if (review.sitterReply === body) return { ok: "No changes to save." };
    // Conditional update: guards against a moderator removing the reply in the meantime.
    const res = await db.review.updateMany({
      where: { id: review.id, sitterId: profile.id, hidden: false, sitterReply: { not: null } },
      data: { sitterReply: body },
    });
    if (!res.count) return { error: "This reply can no longer be edited." };
    revalidateReviewPages(profile.slug, review.bookingId);
    return { ok: "Reply updated." };
  }

  // One reply per review — only set it if nobody else got there first.
  const res = await db.review.updateMany({
    where: { id: review.id, sitterId: profile.id, hidden: false, sitterReply: null },
    data: { sitterReply: body, sitterRepliedAt: new Date() },
  });
  if (!res.count) return { error: "You've already replied to this review." };
  revalidateReviewPages(profile.slug, review.bookingId);
  return { ok: "Reply posted — it's now visible on your public profile." };
}

/* ─────────────────────── Sitter: private rating of a pet parent ─────────────────────── */

const OwnerReviewSchema = z.object({
  bookingId: id,
  rating: z.coerce.number("Please choose a star rating.").int().min(1, "Please choose a star rating.").max(5, "Please choose a star rating."),
  tags: z.array(z.enum(OWNER_REVIEW_TAGS)).max(OWNER_REVIEW_TAGS.length),
  note: z
    .string()
    .trim()
    .max(OWNER_NOTE_MAX, `Please keep your note under ${OWNER_NOTE_MAX} characters.`)
    .transform((v) => v || null),
});

/** Sitter rates the pet parent of one of their COMPLETED bookings. One rating per booking; not editable. */
export async function rateOwner(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { user, profile } = await requireSitter();
  const parsed = OwnerReviewSchema.safeParse({
    bookingId: formData.get("bookingId"),
    rating: formData.get("rating") ?? undefined,
    tags: formData.getAll("tags").map(String),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return firstError(parsed.error);
  const input = parsed.data;

  const booking = await db.booking.findFirst({
    where: { id: input.bookingId, sitterId: profile.id },
    select: { id: true, status: true, ownerId: true, ownerReview: { select: { id: true } } },
  });
  if (!booking) return { error: "We couldn't find that booking." };
  if (booking.status !== "COMPLETED") return { error: "You can rate the pet parent once the booking is completed." };
  if (booking.ownerReview) return { error: "You've already rated this pet parent for this booking." };
  if (booking.ownerId === user.id) return { error: "You can't rate yourself." };

  try {
    await db.ownerReview.create({
      data: {
        bookingId: booking.id,
        sitterId: profile.id,
        ownerId: booking.ownerId,
        rating: input.rating,
        body: composeOwnerNote(input.tags, input.note),
      },
    });
  } catch {
    return { error: "You've already rated this pet parent for this booking." }; // unique bookingId race
  }
  revalidatePath("/sitter", "layout");
  revalidatePath(`/admin/bookings/${booking.id}`);
  revalidatePath(`/admin/users/${booking.ownerId}`);
  revalidatePath("/admin/reviews");
  return { ok: "Thanks! Your rating helps other sitters." };
}

/* ─────────────────────────────── Admin moderation ─────────────────────────────── */

const NOT_ALLOWED = { error: "You don't have permission to do that." } as const;
const reason = z.string().trim().min(5, "Please give a reason (at least 5 characters).").max(300, "Please keep the reason under 300 characters.");

const OwnerModerationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("hide"), ownerReviewId: id, reason }),
  z.object({ op: z.literal("unhide"), ownerReviewId: id, reason }),
]);

/** Hide / unhide a sitter's private rating of a pet parent (hidden ratings don't count towards reputation). */
export async function moderateOwnerReview(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await getAdminOrNull();
  if (!admin) return NOT_ALLOWED;
  const parsed = OwnerModerationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstError(parsed.error);
  const input = parsed.data;

  const r = await db.ownerReview.findUnique({ where: { id: input.ownerReviewId }, select: { id: true, hidden: true, ownerId: true, bookingId: true } });
  if (!r) return { error: "Rating not found — it may have been deleted." };
  const hide = input.op === "hide";
  if (r.hidden === hide) return { error: hide ? "This rating is already hidden." : "This rating is already visible." };

  await db.ownerReview.update({ where: { id: r.id }, data: { hidden: hide } });
  await audit(admin.id, hide ? "ownerReview.hide" : "ownerReview.unhide", "OwnerReview", r.id, {
    reason: input.reason,
    ownerId: r.ownerId,
    bookingId: r.bookingId,
  });
  revalidatePath("/admin/reviews");
  revalidatePath(`/admin/users/${r.ownerId}`);
  revalidatePath(`/admin/bookings/${r.bookingId}`);
  revalidatePath("/sitter", "layout");
  return { ok: true, message: hide ? "Rating hidden — it no longer counts towards this pet parent's reputation." : "Rating is visible again." };
}

const RemoveReplySchema = z.object({ reviewId: id, reason });

/** Remove a sitter's public reply from a review. */
export async function removeReviewReply(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await getAdminOrNull();
  if (!admin) return NOT_ALLOWED;
  const parsed = RemoveReplySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstError(parsed.error);

  const review = await db.review.findUnique({
    where: { id: parsed.data.reviewId },
    select: { id: true, sitterReply: true, sitterRepliedAt: true, bookingId: true, sitterId: true, sitter: { select: { slug: true } } },
  });
  if (!review) return { error: "Review not found — it may have been deleted." };
  if (!review.sitterReply) return { error: "This review has no reply." };

  await db.review.update({ where: { id: review.id }, data: { sitterReply: null, sitterRepliedAt: null } });
  await audit(admin.id, "review.reply.remove", "Review", review.id, {
    reason: parsed.data.reason,
    sitterId: review.sitterId,
    reply: review.sitterReply,
    repliedAt: review.sitterRepliedAt,
  });
  revalidateReviewPages(review.sitter.slug, review.bookingId);
  return { ok: true, message: "Reply removed from the public profile." };
}
