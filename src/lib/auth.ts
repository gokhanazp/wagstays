import "server-only";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "./db";
import { getCurrentUser, type CurrentUser } from "./session";

/** Path of the current request (set by src/proxy.ts) so guards can send users back after login. */
async function currentPath() {
  return (await headers()).get("x-pathname") ?? "/";
}

/** Any signed-in, non-suspended user. Use in pages and server actions. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(await currentPath())}`);
  if (user.suspended) redirect("/suspended");
  return user;
}

/** Admins only. Non-admins get a 404 so the admin area isn't discoverable. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") notFound();
  return user;
}

/** Signed-in sitter with a profile. Owners without a profile are sent to the application. */
export async function requireSitter() {
  const user = await requireUser();
  const profile = await db.sitterProfile.findUnique({ where: { userId: user.id }, include: { city: true } });
  if (!profile) redirect("/become-a-sitter");
  return { user, profile };
}

/** For server actions: returns null instead of redirecting. */
export async function getAdminOrNull() {
  const user = await getCurrentUser();
  return user && user.role === "ADMIN" && !user.suspended ? user : null;
}
