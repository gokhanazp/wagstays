"use server";

import { revalidatePath } from "@/i18n/revalidate";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { formatRelativeDayTime, isBookableSlot } from "@/lib/meet-greet";

const schema = (invalidCode: string) =>
  z.object({
    code: z
      .string()
      .trim()
      .transform((s) => s.replace(/^#/, "").toUpperCase())
      .pipe(z.string().regex(/^WS-\d{5}$/, invalidCode)),
    slot: z.iso.datetime({ offset: true }),
  });

export type BookMeetGreetResult = { ok: true; label: string } | { ok: false; error: string };

export async function bookMeetGreet(code: string, slotISO: string): Promise<BookMeetGreetResult> {
  const [t, locale] = await Promise.all([getTranslations("apply.meetGreet.errors"), getLocale()]);
  const parsed = schema(t("invalidCode")).safeParse({ code, slot: slotISO });
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return { ok: false, error: fieldErrors.code?.[0] ?? t("pickSlot") };
  }
  const now = new Date();
  if (!isBookableSlot(parsed.data.slot, now)) {
    return { ok: false, error: t("unavailable") };
  }

  const application = await db.sitterApplication.findUnique({
    where: { trackingCode: parsed.data.code },
    select: { id: true, status: true },
  });
  if (!application) return { ok: false, error: t("notFound") };
  if (application.status !== "IN_REVIEW" && application.status !== "MEET_GREET") {
    return { ok: false, error: t("closed") };
  }

  const meetGreetAt = new Date(parsed.data.slot);
  await db.sitterApplication.update({
    where: { id: application.id },
    data: { meetGreetAt, status: "MEET_GREET" },
  });
  revalidatePath("/become-a-sitter/submitted");
  return { ok: true, label: formatRelativeDayTime(meetGreetAt, now, undefined, locale) };
}
