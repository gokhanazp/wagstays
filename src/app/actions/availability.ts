"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSitter } from "@/lib/auth";
import { ACTIVE_BOOKING_STATUSES } from "@/lib/availability";
import { AVAILABILITY_LIMITS, addDays, daysBetween, formatDay, formatMinute, isIsoDay, todayIn, WEEKDAY_LABELS, zonedInstant } from "@/lib/availability-core";
import type { SitterActionState } from "./sitter";

// Sitter availability: weekly hours, time off and booking rules. Every action re-loads the signed-in
// sitter (requireSitter) and only touches that sitter's rows.

function revalidate(slug: string) {
  revalidatePath("/sitter/availability");
  revalidatePath("/sitter", "layout");
  revalidatePath(`/sitters/${slug}`);
  revalidatePath("/sitters");
}

function fail(error: z.ZodError): SitterActionState {
  const fieldErrors = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
  const first = Object.values(fieldErrors).flat()[0] ?? error.issues[0]?.message;
  return { error: first ?? "Please check the form.", fieldErrors };
}

/* ───────────────────────────── Weekly hours ───────────────────────────── */

const Range = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(1440),
    endMinute: z.number().int().min(0).max(1440),
  })
  .refine((r) => r.startMinute % 30 === 0 && r.endMinute % 30 === 0, "Times must be on the hour or half hour.")
  .refine((r) => r.startMinute < r.endMinute, "Each time range must end after it starts.");

const HoursSchema = z
  .array(Range)
  .max(7 * AVAILABILITY_LIMITS.maxRangesPerDay, "Too many time ranges.")
  .superRefine((ranges, ctx) => {
    for (let wd = 0; wd < 7; wd++) {
      const day = ranges.filter((r) => r.weekday === wd).sort((a, b) => a.startMinute - b.startMinute);
      if (day.length > AVAILABILITY_LIMITS.maxRangesPerDay) {
        ctx.addIssue({ code: "custom", message: `${WEEKDAY_LABELS[wd]}: at most ${AVAILABILITY_LIMITS.maxRangesPerDay} time ranges per day.` });
      }
      for (let i = 1; i < day.length; i++) {
        if (day[i].startMinute < day[i - 1].endMinute) {
          ctx.addIssue({
            code: "custom",
            message: `${WEEKDAY_LABELS[wd]}: ${formatMinute(day[i - 1].startMinute)} – ${formatMinute(day[i - 1].endMinute)} overlaps ${formatMinute(day[i].startMinute)} – ${formatMinute(day[i].endMinute)}.`,
          });
        }
      }
    }
  });

/** Replaces the sitter's weekly opening hours. `hours` is a JSON array of { weekday, startMinute, endMinute }. */
export async function saveWeeklyHours(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("hours") ?? "[]"));
  } catch {
    return { error: "Couldn't read your hours — please try again." };
  }
  const parsed = HoursSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);
  await db.$transaction([
    db.sitterAvailability.deleteMany({ where: { sitterId: profile.id } }),
    db.sitterAvailability.createMany({ data: parsed.data.map((r) => ({ sitterId: profile.id, ...r })) }),
  ]);
  revalidate(profile.slug);
  return {
    ok: parsed.data.length ? "Weekly hours saved." : "Saved — you're closed every day, so owners can't book you until you add hours.",
  };
}

/* ───────────────────────────── Booking rules ───────────────────────────── */

const RulesSchema = z.object({
  boardingCapacity: z.coerce
    .number("Choose how many pets you can host.")
    .int()
    .min(1, "You need room for at least one pet.")
    .max(AVAILABILITY_LIMITS.maxCapacity, `At most ${AVAILABILITY_LIMITS.maxCapacity} pets at a time.`),
  noticeHours: z.coerce
    .number("Choose a minimum notice.")
    .int()
    .min(0, "Notice can't be negative.")
    .max(AVAILABILITY_LIMITS.maxNoticeHours, "Notice can be at most 7 days."),
});

export async function saveBookingRules(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const parsed = RulesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  await db.sitterProfile.update({ where: { id: profile.id }, data: parsed.data });
  revalidate(profile.slug);
  return { ok: "Booking rules saved." };
}

/* ───────────────────────────── Time off ───────────────────────────── */

const TimeOffSchema = z
  .object({
    startDate: z.string().refine(isIsoDay, "Choose the first day you're away."),
    endDate: z.string().refine(isIsoDay, "Choose the last day you're away."),
    note: z
      .string()
      .trim()
      .max(120, "Keep the note under 120 characters.")
      .optional()
      .transform((v) => (v ? v : null)),
  })
  .refine((d) => d.startDate <= d.endDate, { message: "The last day can't be before the first day.", path: ["endDate"] })
  .refine((d) => daysBetween(d.startDate, d.endDate) < AVAILABILITY_LIMITS.maxTimeOffDays, {
    message: "Time off can be at most a year at a time.",
    path: ["endDate"],
  });

export async function addTimeOff(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const parsed = TimeOffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;
  const tz = profile.city.timeZone;
  const today = todayIn(tz, Date.now());
  if (d.endDate < today) return { error: "That time off is already in the past.", fieldErrors: { endDate: ["Pick a future date."] } };

  const overlap = await db.sitterTimeOff.findFirst({
    where: { sitterId: profile.id, startDate: { lte: d.endDate }, endDate: { gte: d.startDate } },
  });
  if (overlap) {
    return {
      error: `That overlaps your time off ${formatDay(overlap.startDate)}${overlap.endDate !== overlap.startDate ? ` – ${formatDay(overlap.endDate)}` : ""}. Delete it first or pick other dates.`,
    };
  }
  await db.sitterTimeOff.create({ data: { sitterId: profile.id, startDate: d.startDate, endDate: d.endDate, note: d.note } });

  // Existing bookings aren't touched — tell the sitter so they can sort them out.
  const clashes = await db.booking.count({
    where: {
      sitterId: profile.id,
      status: { in: ACTIVE_BOOKING_STATUSES },
      startAt: { lt: new Date(zonedInstant(addDays(d.endDate, 1), 0, tz)) },
      endAt: { gt: new Date(zonedInstant(d.startDate, 0, tz)) },
    },
  });
  revalidate(profile.slug);
  return {
    ok: clashes
      ? `Time off added. Heads-up: ${clashes} existing booking${clashes === 1 ? "" : "s"} fall in this period — check Requests & Bookings.`
      : "Time off added — owners can't book you on those days.",
  };
}

export async function deleteTimeOff(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const parsed = z.object({ id: z.string().trim().min(1).max(64) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Unknown time off." };
  const res = await db.sitterTimeOff.deleteMany({ where: { id: parsed.data.id, sitterId: profile.id } });
  if (!res.count) return { error: "That time off was already removed." };
  revalidate(profile.slug);
  return { ok: "Time off removed." };
}
