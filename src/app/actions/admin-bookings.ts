"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminOrNull } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { allowedTransitions, refreshSitterRating, transitionBooking } from "@/lib/booking-lifecycle";
import { MAX_FEATURED_REVIEWS } from "@/app/admin/reviews/_constants";

export type AdminActionState =
  | { ok?: boolean; message?: string; error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

const NOT_ALLOWED = { error: "You don't have permission to do that." } as const;
const id = z.string().trim().min(1).max(64);

function fail(err: z.ZodError): AdminActionState {
  const fieldErrors = z.flattenError(err).fieldErrors as Record<string, string[] | undefined>;
  return { error: Object.values(fieldErrors).flat()[0] ?? "Please check the form.", fieldErrors };
}

function revalidateBooking(bookingId: string) {
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin");
  revalidatePath("/account", "layout");
  revalidatePath("/sitter", "layout");
}

// ---------- Booking status ----------

const TransitionSchema = z
  .object({
    bookingId: id,
    to: z.enum(["CONFIRMED", "DECLINED", "COMPLETED", "CANCELLED"], "Please choose an action."),
    reason: z.string().trim().max(500, "Please keep the reason under 500 characters.").optional().default(""),
  })
  .refine((d) => d.to !== "CANCELLED" || d.reason.length >= 5, {
    path: ["reason"],
    message: "Please give a reason for cancelling (at least 5 characters).",
  });

export async function adminTransitionBooking(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await getAdminOrNull();
  if (!admin) return NOT_ALLOWED;
  const parsed = TransitionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const { bookingId, to, reason } = parsed.data;

  const booking = await db.booking.findUnique({ where: { id: bookingId }, select: { status: true, sitter: { select: { slug: true } } } });
  if (!booking) return { error: "Booking not found." };
  if (!allowedTransitions(booking.status, "ADMIN").includes(to)) {
    return { error: "This booking's status changed in the meantime — please refresh." };
  }

  try {
    const res = await transitionBooking({ bookingId, to, actor: "ADMIN", reason: reason || null });
    if ("error" in res) return { error: res.error };
  } catch {
    // optimistic concurrency guard in transitionBooking throws if the status changed underneath us
    return { error: "This booking was updated by someone else — please refresh and try again." };
  }

  await audit(admin.id, `booking.${to.toLowerCase()}`, "Booking", bookingId, { from: booking.status, to, reason: reason || undefined });
  revalidateBooking(bookingId);
  if (to === "COMPLETED") revalidatePath(`/sitters/${booking.sitter.slug}`);
  const verb = { CONFIRMED: "confirmed", DECLINED: "declined", COMPLETED: "marked as completed", CANCELLED: "cancelled" }[to];
  return { ok: true, message: `Booking ${verb}.` };
}

// ---------- WagPoints goodwill credit ----------

const CreditSchema = z.object({
  bookingId: id,
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,4}(\.\d{1,2})?$/, "Enter an amount in dollars, e.g. 10 or 7.50.")
    .transform((v) => Math.round(Number(v) * 100))
    .pipe(z.number().int().min(100, "The minimum credit is $1.00.").max(20000, "Credits above $200 need finance sign-off.")),
  reason: z.string().trim().min(5, "Please explain why (at least 5 characters).").max(300, "Please keep the reason under 300 characters."),
});

export async function issueWagPointsCredit(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await getAdminOrNull();
  if (!admin) return NOT_ALLOWED;
  const parsed = CreditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const { bookingId, amount, reason } = parsed.data;

  // The owner always comes from the booking — never from the client.
  const booking = await db.booking.findUnique({ where: { id: bookingId }, select: { ownerId: true } });
  if (!booking) return { error: "Booking not found." };

  const user = await db.user.update({
    where: { id: booking.ownerId },
    data: { wagPointsCents: { increment: amount } },
    select: { wagPointsCents: true, firstName: true },
  });
  await audit(admin.id, "user.wagpoints_credit", "User", booking.ownerId, {
    bookingId,
    amountCents: amount,
    reason,
    balanceAfterCents: user.wagPointsCents,
  });
  revalidateBooking(bookingId);
  revalidatePath("/admin/users", "layout");
  return { ok: true, message: `Credited $${(amount / 100).toFixed(2)} to ${user.firstName}. New balance $${(user.wagPointsCents / 100).toFixed(2)}.` };
}

// ---------- Review moderation ----------

const ReviewSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("hide"),
    reviewId: id,
    reason: z.string().trim().min(5, "Please give a moderation reason (at least 5 characters).").max(300, "Please keep the reason under 300 characters."),
  }),
  z.object({ op: z.literal("unhide"), reviewId: id }),
  z.object({ op: z.literal("feature"), reviewId: id }),
  z.object({ op: z.literal("unfeature"), reviewId: id }),
  z.object({ op: z.literal("delete"), reviewId: id, confirm: z.literal("yes", "Please confirm the deletion.") }),
]);

export async function moderateReview(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await getAdminOrNull();
  if (!admin) return NOT_ALLOWED;
  const parsed = ReviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const input = parsed.data;

  const review = await db.review.findUnique({
    where: { id: input.reviewId },
    select: { id: true, hidden: true, featuredOnHome: true, rating: true, authorName: true, body: true, sitterId: true, bookingId: true, sitter: { select: { slug: true } } },
  });
  if (!review) return { error: "Review not found — it may have been deleted." };

  let message: string;
  switch (input.op) {
    case "hide":
      if (review.hidden) return { error: "This review is already hidden." };
      // A hidden review can't stay on the home page.
      await db.review.update({ where: { id: review.id }, data: { hidden: true, featuredOnHome: false } });
      await audit(admin.id, "review.hide", "Review", review.id, { reason: input.reason, wasFeatured: review.featuredOnHome });
      message = review.featuredOnHome ? "Review hidden and removed from the home page." : "Review hidden from the public site.";
      break;
    case "unhide":
      if (!review.hidden) return { error: "This review is already visible." };
      await db.review.update({ where: { id: review.id }, data: { hidden: false } });
      await audit(admin.id, "review.unhide", "Review", review.id);
      message = "Review is visible again.";
      break;
    case "feature": {
      if (review.featuredOnHome) return { error: "This review is already featured." };
      if (review.hidden) return { error: "Hidden reviews can't be featured. Unhide it first." };
      const featured = await db.review.count({ where: { featuredOnHome: true } });
      if (featured >= MAX_FEATURED_REVIEWS) {
        return { error: `The home page shows ${MAX_FEATURED_REVIEWS} testimonials. Unfeature one before featuring another.` };
      }
      await db.review.update({ where: { id: review.id }, data: { featuredOnHome: true } });
      await audit(admin.id, "review.feature", "Review", review.id);
      message = "Review featured on the home page.";
      break;
    }
    case "unfeature":
      if (!review.featuredOnHome) return { error: "This review isn't featured." };
      await db.review.update({ where: { id: review.id }, data: { featuredOnHome: false } });
      await audit(admin.id, "review.unfeature", "Review", review.id);
      message = "Review removed from the home page.";
      break;
    case "delete":
      await db.review.delete({ where: { id: review.id } });
      await audit(admin.id, "review.delete", "Review", review.id, {
        sitterId: review.sitterId,
        bookingId: review.bookingId,
        authorName: review.authorName,
        rating: review.rating,
        body: review.body,
      });
      message = "Review deleted.";
      break;
  }

  await refreshSitterRating(review.sitterId);
  revalidatePath("/admin/reviews");
  revalidatePath("/");
  revalidatePath("/sitters");
  revalidatePath(`/sitters/${review.sitter.slug}`);
  if (review.bookingId) revalidatePath(`/admin/bookings/${review.bookingId}`);
  return { ok: true, message };
}
