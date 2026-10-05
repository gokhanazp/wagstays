"use server";

import { revalidatePath } from "@/i18n/revalidate";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/** Returns the new state, or `{ needsLogin: true }` so the client can redirect to /login. */
export async function toggleFavorite(sitterId: string): Promise<{ isFavorite?: boolean; needsLogin?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { needsLogin: true };
  if (user.suspended) return {};
  const key = { userId_sitterId: { userId: user.id, sitterId } };
  const existing = await db.favorite.findUnique({ where: key });
  if (existing) await db.favorite.delete({ where: key });
  else await db.favorite.create({ data: { userId: user.id, sitterId } });
  revalidatePath("/", "layout");
  return { isFavorite: !existing };
}
