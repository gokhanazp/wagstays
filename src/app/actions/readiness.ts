"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { normalizeNaPhone } from "@/lib/phone";

export type ReadinessFormState = { ok?: boolean; message?: string; error?: string; fieldErrors?: Record<string, string[] | undefined> } | undefined;

const PhoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, "Please enter your phone number.")
    .max(25)
    .transform((v, ctx) => {
      const n = normalizeNaPhone(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "Please enter a valid Canadian or US number, e.g. (416) 555-0123." });
        return z.NEVER;
      }
      return n;
    }),
});

/** Inline "add your phone" on checkout: validates a North-American number and saves it normalised. */
export async function savePhoneForBooking(_: ReadinessFormState, formData: FormData): Promise<ReadinessFormState> {
  const user = await getCurrentUser();
  if (!user || user.suspended) return { error: "Please log in again." };
  const parsed = PhoneSchema.safeParse({ phone: formData.get("phone") ?? "" });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  await db.user.update({ where: { id: user.id }, data: { phone: parsed.data.phone } });
  revalidatePath("/book/[slug]", "page");
  revalidatePath("/sitters/[slug]", "page");
  revalidatePath("/account", "layout");
  return { ok: true, message: `Saved ${parsed.data.phone}.` };
}
