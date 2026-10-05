"use server";

import { z } from "zod";
import { audit } from "@/lib/audit";
import { getAdminOrNull } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPasswordLink } from "@/lib/password-links";
import { getAuthUserId } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { localizedPath } from "@/i18n/server";
import { getTranslations } from "next-intl/server";

export type SetPasswordState = { error?: string; fieldErrors?: Record<string, string[] | undefined> } | undefined;

const Schema = (t: Awaited<ReturnType<typeof getTranslations<"auth.errors">>>) =>
  z
    .object({
      password: z.string().min(8, t("passwordMin")),
      confirm: z.string(),
    })
    .refine((d) => d.password === d.confirm, { path: ["confirm"], message: t("passwordsDontMatch") });

/** Sets a new password for the user signed in through a recovery / invite link. */
export async function setPassword(_: SetPasswordState, formData: FormData): Promise<SetPasswordState> {
  const t = await getTranslations("auth.errors");
  const parsed = Schema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const auth = await getAuthUserId();
  if (!auth) return { error: t("linkExpired") };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.code === "same_password" ? t("samePassword") : error.message };
  const user = await db.user.findUnique({ where: { id: auth.id }, select: { role: true } });
  redirect(await localizedPath(user?.role === "SITTER" ? "/sitter" : user?.role === "ADMIN" ? "/admin" : "/"));
}

/** Admin: issue a set-password link for a user (shown once in the admin UI). */
export async function adminCreatePasswordLink(userId: string): Promise<{ url?: string; expiresInHours?: number; error?: string }> {
  const admin = await getAdminOrNull();
  if (!admin) return { error: "You don't have permission to do that." };
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!user) return { error: "User not found." };
  try {
    const link = await createPasswordLink(user.email);
    await audit(admin.id, "user.password_link", "User", user.id, { expiresInHours: link.expiresInHours });
    return link;
  } catch (e) {
    return { error: (e as Error).message };
  }
}
