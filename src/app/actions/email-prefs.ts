"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { revalidatePath } from "@/i18n/revalidate";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export type EmailPrefsState = { ok?: boolean; message?: string; error?: string } | undefined;

const checkbox = z
  .string()
  .nullable()
  .transform((v) => v === "1" || v === "on" || v === "true");

const schema = z.object({ emailBookings: checkbox, emailMessages: checkbox, emailReminders: checkbox });

/** Saves the three optional email categories. Account/security/payment emails can't be turned off. */
export async function updateEmailPrefs(_: EmailPrefsState, formData: FormData): Promise<EmailPrefsState> {
  const user = await getCurrentUser();
  if (!user || user.suspended) return { error: (await getTranslations("account.errors"))("logInAgain") };
  const parsed = schema.safeParse({
    emailBookings: formData.get("emailBookings"),
    emailMessages: formData.get("emailMessages"),
    emailReminders: formData.get("emailReminders"),
  });
  if (!parsed.success) return { error: (await getTranslations("account.errors"))("checkForm") };
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/account/settings");
  return { ok: true, message: (await getTranslations("account.emailPrefs"))("saved") };
}
