"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "@/i18n/revalidate";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { normalizeNaPhone } from "@/lib/phone";

export type ReadinessFormState = { ok?: boolean; message?: string; error?: string; fieldErrors?: Record<string, string[] | undefined> } | undefined;

const phoneSchema = (t: Awaited<ReturnType<typeof getTranslations<"account.errors.readiness">>>) =>
  z.object({
    phone: z
      .string()
      .trim()
      .min(1, t("phone"))
      .max(25)
      .transform((v, ctx) => {
        const n = normalizeNaPhone(v);
        if (!n) {
          ctx.addIssue({ code: "custom", message: t("invalidPhone") });
          return z.NEVER;
        }
        return n;
      }),
  });

/** Inline "add your phone" on checkout: validates a North-American number and saves it normalised. */
export async function savePhoneForBooking(_: ReadinessFormState, formData: FormData): Promise<ReadinessFormState> {
  const [t, te] = await Promise.all([getTranslations("account.errors.readiness"), getTranslations("account.errors")]);
  const user = await getCurrentUser();
  if (!user || user.suspended) return { error: te("logInAgain") };
  const parsed = phoneSchema(t).safeParse({ phone: formData.get("phone") ?? "" });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  await db.user.update({ where: { id: user.id }, data: { phone: parsed.data.phone } });
  revalidatePath("/book/[slug]", "page");
  revalidatePath("/sitters/[slug]", "page");
  revalidatePath("/account", "layout");
  return { ok: true, message: t("saved", { phone: parsed.data.phone }) };
}
