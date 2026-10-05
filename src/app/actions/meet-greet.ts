"use server";

import { revalidatePath } from "@/i18n/revalidate";
import { z } from "zod";
import { db } from "@/lib/db";
import { formatRelativeDayTime, isBookableSlot } from "@/lib/meet-greet";

const schema = z.object({
  code: z
    .string()
    .trim()
    .transform((s) => s.replace(/^#/, "").toUpperCase())
    .pipe(z.string().regex(/^WS-\d{5}$/, "Invalid tracking code.")),
  slot: z.iso.datetime({ offset: true }),
});

export type BookMeetGreetResult = { ok: true; label: string } | { ok: false; error: string };

export async function bookMeetGreet(code: string, slotISO: string): Promise<BookMeetGreetResult> {
  const parsed = schema.safeParse({ code, slot: slotISO });
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return { ok: false, error: fieldErrors.code?.[0] ?? "Please pick one of the suggested times." };
  }
  const now = new Date();
  if (!isBookableSlot(parsed.data.slot, now)) {
    return { ok: false, error: "That time is no longer available. Please refresh and pick another slot." };
  }

  const application = await db.sitterApplication.findUnique({
    where: { trackingCode: parsed.data.code },
    select: { id: true, status: true },
  });
  if (!application) return { ok: false, error: "We couldn't find that application." };
  if (application.status !== "IN_REVIEW" && application.status !== "MEET_GREET") {
    return { ok: false, error: "This application is no longer booking a Meet & Greet." };
  }

  const meetGreetAt = new Date(parsed.data.slot);
  await db.sitterApplication.update({
    where: { id: application.id },
    data: { meetGreetAt, status: "MEET_GREET" },
  });
  revalidatePath("/become-a-sitter/submitted");
  return { ok: true, label: formatRelativeDayTime(meetGreetAt, now) };
}
