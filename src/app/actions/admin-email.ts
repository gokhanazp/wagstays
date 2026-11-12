"use server";

import { z } from "zod";
import { revalidatePath } from "@/i18n/revalidate";
import { localePrefix } from "@/i18n/routing";
import { audit } from "@/lib/audit";
import { getAdminOrNull } from "@/lib/auth";
import { db } from "@/lib/db";
import { emit } from "@/lib/events";
import { getOrigin } from "@/lib/origin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SimpleResult } from "./admin-core";

// Admin help for people stuck at "confirm your email" (e.g. the confirmation mail was held by their provider).

const Id = z.string().min(1);

async function load(userId: string) {
  const admin = await getAdminOrNull();
  if (!admin) return { error: "You don't have permission to do that." } as const;
  const parsed = Id.safeParse(userId);
  if (!parsed.success) return { error: "Invalid request." } as const;
  const user = await db.user.findUnique({ where: { id: parsed.data }, select: { id: true, email: true, locale: true, emailConfirmedAt: true, deletedAt: true } });
  if (!user || user.deletedAt) return { error: "User not found." } as const;
  return { admin, user } as const;
}

/** Sends Supabase's sign-up confirmation email again (link lands in the user's language). */
export async function adminResendConfirmation(userId: string): Promise<SimpleResult> {
  const r = await load(userId);
  if ("error" in r) return { error: r.error };
  if (r.user.emailConfirmedAt) return { error: "This email address is already confirmed." };
  const next = localePrefix(r.user.locale) || "/";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: r.user.email,
    options: { emailRedirectTo: `${await getOrigin()}/auth/confirm?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: error.code === "over_email_send_rate_limit" ? "Please wait a minute before sending another email to this address." : error.message };
  await audit(r.admin.id, "user.confirmation_resent", "User", r.user.id, { email: r.user.email });
  revalidatePath(`/admin/users/${r.user.id}`);
  return { ok: true };
}

/** Marks the email as confirmed without the link — use only after checking the address really belongs to the person. */
export async function adminConfirmEmail(userId: string): Promise<SimpleResult> {
  const r = await load(userId);
  if ("error" in r) return { error: r.error };
  if (r.user.emailConfirmedAt) return { ok: true };
  const { error } = await createSupabaseAdminClient().auth.admin.updateUserById(r.user.id, { email_confirm: true });
  if (error) return { error: error.message };
  await db.user.update({ where: { id: r.user.id }, data: { emailConfirmedAt: new Date() } });
  await audit(r.admin.id, "user.email_confirmed_manually", "User", r.user.id, { email: r.user.email });
  emit({ type: "user.emailConfirmed", userId: r.user.id }); // welcome email
  revalidatePath(`/admin/users/${r.user.id}`);
  revalidatePath("/admin/users");
  return { ok: true };
}
