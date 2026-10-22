"use server";

import { routing } from "@/i18n/routing";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Remembers a signed-in user's language for emails (DB) and Supabase auth emails (user_metadata). No-op when signed out. */
export async function saveLocalePreference(locale: string) {
  if (!(routing.locales as readonly string[]).includes(locale)) return;
  const auth = await getAuthUserId();
  if (!auth) return;
  const { count } = await db.user.updateMany({ where: { id: auth.id, NOT: { locale } }, data: { locale } });
  if (count) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.updateUser({ data: { locale } });
  }
}
