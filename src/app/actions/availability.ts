"use server";

import { getLocale, getTranslations } from "next-intl/server";
import { revalidatePath } from "@/i18n/revalidate";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSitter } from "@/lib/auth";
import { ACTIVE_BOOKING_STATUSES } from "@/lib/availability";
import { AVAILABILITY_LIMITS, addDays, daysBetween, formatDay, formatMinute, isIsoDay, todayIn, zonedInstant } from "@/lib/availability-core";
import type { SitterActionState } from "./sitter";

// Sitter availability: weekly hours, time off and booking rules. Every action re-loads the signed-in
// sitter (requireSitter) and only touches that sitter's rows.

function revalidate(slug: string) {
  revalidatePath("/sitter/availability");
  revalidatePath("/sitter", "layout");
  revalidatePath(`/sitters/${slug}`);
  revalidatePath("/sitters");
}

const tAvail = () => getTranslations("sitter.availabilityActions");
type T = Awaited<ReturnType<typeof tAvail>>;
const tWeekday = () => getTranslations("common.enums.weekday");
type W = Awaited<ReturnType<typeof tWeekday>>;
const dayName = (w: W, wd: number) => w(String(wd) as "0");

async function fail(error: z.ZodError): Promise<SitterActionState> {
  const fieldErrors = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
  const first = Object.values(fieldErrors).flat()[0] ?? error.issues[0]?.message;
  return { error: first ?? (await getTranslations("sitter.actions"))("checkForm"), fieldErrors };
}

/* ───────────────────────────── Weekly hours ───────────────────────────── */

const range = (t: T) =>
  z
    .object({
      weekday: z.number().int().min(0).max(6),
      startMinute: z.number().int().min(0).max(1440),
      endMinute: z.number().int().min(0).max(1440),
    })
    .refine((r) => r.startMinute % 30 === 0 && r.endMinute % 30 === 0, t("halfHour"))
    .refine((r) => r.startMinute < r.endMinute, t("endAfterStart"));

const hoursSchema = (t: T, w: W, locale: string) =>
  z
    .array(range(t))
    .max(7 * AVAILABILITY_LIMITS.maxRangesPerDay, t("tooMany"))
    .superRefine((ranges, ctx) => {
      for (let wd = 0; wd < 7; wd++) {
        const day = ranges.filter((r) => r.weekday === wd).sort((a, b) => a.startMinute - b.startMinute);
        if (day.length > AVAILABILITY_LIMITS.maxRangesPerDay) {
          ctx.addIssue({ code: "custom", message: t("maxPerDay", { day: dayName(w, wd), max: AVAILABILITY_LIMITS.maxRangesPerDay }) });
        }
        for (let i = 1; i < day.length; i++) {
          if (day[i].startMinute < day[i - 1].endMinute) {
            ctx.addIssue({
              code: "custom",
              message: t("overlap", {
                day: dayName(w, wd),
                a: `${formatMinute(day[i - 1].startMinute, locale)} – ${formatMinute(day[i - 1].endMinute, locale)}`,
                b: `${formatMinute(day[i].startMinute, locale)} – ${formatMinute(day[i].endMinute, locale)}`,
              }),
            });
          }
        }
      }
    });

/** Replaces the sitter's weekly opening hours. `hours` is a JSON array of { weekday, startMinute, endMinute }. */
export async function saveWeeklyHours(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const [t, w, locale] = await Promise.all([tAvail(), tWeekday(), getLocale()]);
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("hours") ?? "[]"));
  } catch {
    return { error: t("unreadable") };
  }
  const parsed = hoursSchema(t, w, locale).safeParse(raw);
  if (!parsed.success) return fail(parsed.error);
  await db.$transaction([
    db.sitterAvailability.deleteMany({ where: { sitterId: profile.id } }),
    db.sitterAvailability.createMany({ data: parsed.data.map((r) => ({ sitterId: profile.id, ...r })) }),
  ]);
  revalidate(profile.slug);
  return {
    ok: parsed.data.length ? t("hoursSaved") : t("closedEveryDay"),
  };
}

/* ───────────────────────────── Booking rules ───────────────────────────── */

const rulesSchema = (t: T) =>
  z.object({
    boardingCapacity: z.coerce
      .number(t("capacityNumber"))
      .int()
      .min(1, t("capacityMin"))
      .max(AVAILABILITY_LIMITS.maxCapacity, t("capacityMax", { max: AVAILABILITY_LIMITS.maxCapacity })),
    noticeHours: z.coerce
      .number(t("noticeNumber"))
      .int()
      .min(0, t("noticeMin"))
      .max(AVAILABILITY_LIMITS.maxNoticeHours, t("noticeMax")),
  });

export async function saveBookingRules(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const t = await tAvail();
  const parsed = rulesSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  await db.sitterProfile.update({ where: { id: profile.id }, data: parsed.data });
  revalidate(profile.slug);
  return { ok: t("rulesSaved") };
}

/* ───────────────────────────── Time off ───────────────────────────── */

const timeOffSchema = (t: T) =>
  z
    .object({
      startDate: z.string().refine(isIsoDay, t("firstDay")),
      endDate: z.string().refine(isIsoDay, t("lastDay")),
      note: z
        .string()
        .trim()
        .max(120, t("noteMax"))
        .optional()
        .transform((v) => (v ? v : null)),
    })
    .refine((d) => d.startDate <= d.endDate, { message: t("lastBeforeFirst"), path: ["endDate"] })
    .refine((d) => daysBetween(d.startDate, d.endDate) < AVAILABILITY_LIMITS.maxTimeOffDays, {
      message: t("maxYear"),
      path: ["endDate"],
    });

export async function addTimeOff(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const [t, locale] = await Promise.all([tAvail(), getLocale()]);
  const parsed = timeOffSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;
  const tz = profile.city.timeZone;
  const today = todayIn(tz, Date.now());
  if (d.endDate < today) return { error: t("inPast"), fieldErrors: { endDate: [t("pickFuture")] } };

  const overlap = await db.sitterTimeOff.findFirst({
    where: { sitterId: profile.id, startDate: { lte: d.endDate }, endDate: { gte: d.startDate } },
  });
  if (overlap) {
    return {
      error: t("overlapTimeOff", {
        range: `${formatDay(overlap.startDate, locale)}${overlap.endDate !== overlap.startDate ? ` – ${formatDay(overlap.endDate, locale)}` : ""}`,
      }),
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
    ok: clashes ? t("addedClashes", { count: clashes }) : t("added"),
  };
}

export async function deleteTimeOff(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const t = await tAvail();
  const parsed = z.object({ id: z.string().trim().min(1).max(64) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: t("unknown") };
  const res = await db.sitterTimeOff.deleteMany({ where: { id: parsed.data.id, sitterId: profile.id } });
  if (!res.count) return { error: t("alreadyRemoved") };
  revalidate(profile.slug);
  return { ok: t("removed") };
}
