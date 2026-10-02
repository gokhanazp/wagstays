"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { getAdminOrNull } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPasswordLink, findValidToken } from "@/lib/password-tokens";
import { createSession } from "@/lib/session";

export type SetPasswordState = { error?: string; fieldErrors?: Record<string, string[] | undefined> } | undefined;

const Schema = z
  .object({
    token: z.string().min(10),
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match." });

/** Public: completes a one-time set/reset link, signs the user in. */
export async function setPasswordWithToken(_: SetPasswordState, formData: FormData): Promise<SetPasswordState> {
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const row = await findValidToken(parsed.data.token);
  if (!row) return { error: "This link has expired or was already used. Ask support for a new one." };

  const used = await db.passwordToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (used.count !== 1) return { error: "This link was already used." };
  await db.user.update({ where: { id: row.userId }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 10) } });
  await createSession(row.userId);
  const user = await db.user.findUnique({ where: { id: row.userId }, select: { role: true } });
  redirect(user?.role === "SITTER" ? "/sitter" : "/");
}

/** Admin: issue a set-password link for a user (shown once in the admin UI). */
export async function adminCreatePasswordLink(userId: string): Promise<{ url?: string; expiresInHours?: number; error?: string }> {
  const admin = await getAdminOrNull();
  if (!admin) return { error: "You don't have permission to do that." };
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return { error: "User not found." };
  const link = await createPasswordLink(user.id, "RESET");
  await audit(admin.id, "user.password_link", "User", user.id, { expiresInHours: link.expiresInHours });
  return link;
}
