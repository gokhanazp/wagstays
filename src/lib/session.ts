import "server-only";
import { cache } from "react";
import { db } from "./db";
import { createSupabaseServerClient } from "./supabase/server";

// Auth is Supabase Auth: the session lives in Supabase cookies (refreshed by src/proxy.ts) and
// `User.id` equals the Supabase auth user id. Pages and actions only use getCurrentUser().

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  role: true,
  suspended: true,
  phone: true,
  wagPointsCents: true,
  _count: { select: { pets: { where: { archivedAt: null } }, favorites: true } },
} as const;

/** Verified Supabase auth user id for this request, or null. */
export const getAuthUserId = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
});

export const getCurrentUser = cache(async () => {
  const auth = await getAuthUserId();
  if (!auth) return null;
  // Closed accounts (deletedAt set) are treated as signed out.
  const user = await db.user.findUnique({ where: { id: auth.id, deletedAt: null }, select: userSelect });
  // Keep the profile email in sync after a confirmed email change in Supabase Auth.
  if (user && auth.email && auth.email !== user.email) {
    return db.user.update({ where: { id: user.id }, data: { email: auth.email }, select: userSelect });
  }
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
