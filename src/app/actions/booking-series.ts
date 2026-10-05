"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "@/i18n/revalidate";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { requireSitter } from "@/lib/auth";
import { allowedTransitions, transitionBooking } from "@/lib/booking-lifecycle";
import { CANCEL_REASONS } from "@/app/[locale]/(site)/account/_lib";
import type { BookingStatus } from "@/lib/constants";
import { redirect } from "next/navigation";
import { localizedPath } from "@/i18n/server";

// Weekly series actions: "cancel this and all later occurrences" for owners and sitters, and
// "accept all pending" for sitters. Each occurrence goes through transitionBooking (WagPoints refunds,
// events) exactly like a single booking.

export type SeriesState = { ok?: string; error?: string; fieldErrors?: Record<string, string[] | undefined> } | undefined;

function revalidateAll(slug: string, ids: string[]) {
  revalidatePath("/account/bookings");
  for (const id of ids) revalidatePath(`/account/bookings/${id}`);
  revalidatePath("/sitter", "layout");
  revalidatePath("/admin/bookings");
  revalidatePath(`/sitters/${slug}`);
}

/** This occurrence plus every later one in the series that's still pending / confirmed. */
async function laterOccurrences(seriesId: string, from: Date) {
  return db.booking.findMany({
    where: { seriesId, startAt: { gte: from }, status: { in: ["PENDING", "CONFIRMED"] } },
    orderBy: { startAt: "asc" },
    select: { id: true, status: true },
  });
}

async function run(items: { id: string; to: BookingStatus }[], actor: "OWNER" | "SITTER", reason: string | null) {
  let done = 0;
  const errors: string[] = [];
  for (const it of items) {
    const res = await transitionBooking({
      bookingId: it.id,
      to: it.to,
      actor,
      reason,
      ...(actor === "SITTER" && it.to === "DECLINED" && { sitterNote: reason }),
    });
    if ("error" in res) errors.push(res.error);
    else done++;
  }
  return { done, errors };
}

type T = Awaited<ReturnType<typeof getTranslations<"booking.actions">>>;

const ownerSchema = (t: T) => z.object({
  reason: z.enum(CANCEL_REASONS, t("chooseReason")),
  details: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null)),
});

/** Owner: cancel this occurrence and all later ones in its weekly series. */
export async function cancelSeriesAsOwner(bookingId: string, _: SeriesState, formData: FormData): Promise<SeriesState> {
  const t = await getTranslations("booking.actions");
  const user = await getCurrentUser();
  if (!user || user.suspended) return { error: t("loginAgain") };
  const booking = await db.booking.findUnique({ where: { id: bookingId }, include: { sitter: { select: { slug: true } } } });
  if (!booking || booking.ownerId !== user.id) return { error: t("notFound") };
  if (!booking.seriesId) return { error: t("notSeries") };
  const parsed = ownerSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { reason, details } = parsed.data;

  const items = (await laterOccurrences(booking.seriesId, booking.startAt))
    .filter((b) => allowedTransitions(b.status, "OWNER").includes("CANCELLED"))
    .map((b) => ({ id: b.id, to: "CANCELLED" as const }));
  if (!items.length) return { error: t("nothingLeft") };

  const { done, errors } = await run(items, "OWNER", details ? `${reason} — ${details}` : reason);
  revalidateAll(booking.sitter.slug, items.map((i) => i.id));
  if (!done) return { error: errors[0] ?? t("couldntCancel") };
  redirect(await localizedPath(`/account/bookings/${booking.id}?notice=cancelled`));
}

const sitterSchema = (t: T) => z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("accept-all"), bookingId: z.string().trim().min(1).max(64) }),
  z.object({
    intent: z.literal("cancel-later"),
    bookingId: z.string().trim().min(1).max(64),
    reason: z.string().trim().min(5, t("explain")).max(500),
  }),
]);

/** Sitter: accept every pending occurrence, or cancel / decline this and all later occurrences. */
export async function sitterSeriesAction(_: SeriesState, formData: FormData): Promise<SeriesState> {
  const { profile } = await requireSitter();
  const t = await getTranslations("booking.actions");
  const parsed = sitterSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>;
    return { error: Object.values(fieldErrors).flat()[0] ?? t("checkForm"), fieldErrors };
  }
  const d = parsed.data;
  const booking = await db.booking.findFirst({ where: { id: d.bookingId, sitterId: profile.id }, select: { id: true, seriesId: true, startAt: true } });
  if (!booking) return { error: t("bookingNotFound") };
  if (!booking.seriesId) return { error: t("notSeries") };

  if (d.intent === "accept-all") {
    const pending = await db.booking.findMany({
      where: { seriesId: booking.seriesId, sitterId: profile.id, status: "PENDING", startAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!pending.length) return { error: t("noPending") };
    const { done, errors } = await run(pending.map((b) => ({ id: b.id, to: "CONFIRMED" })), "SITTER", null);
    revalidateAll(profile.slug, pending.map((b) => b.id));
    return done ? { ok: t("accepted", { count: done }) } : { error: errors[0] ?? t("couldntAccept") };
  }

  const later = await laterOccurrences(booking.seriesId, booking.startAt);
  const items = later.flatMap((b) => {
    const allowed = allowedTransitions(b.status, "SITTER");
    // sitters decline requests they haven't accepted yet and cancel confirmed ones
    const to: BookingStatus | null = allowed.includes("CANCELLED") ? "CANCELLED" : allowed.includes("DECLINED") ? "DECLINED" : null;
    return to ? [{ id: b.id, to }] : [];
  });
  if (!items.length) return { error: t("nothingLeft") };
  const { done, errors } = await run(items, "SITTER", d.reason);
  revalidateAll(profile.slug, items.map((i) => i.id));
  return done ? { ok: t("cancelled", { count: done }) } : { error: errors[0] ?? t("couldntCancel") };
}
