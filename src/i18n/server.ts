import "server-only";
import { getLocale } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { localePrefix } from "./routing";

/** Prefixes an app path with the current locale: "/account" → "/fr/account" in French. */
export async function localizedPath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//") || /^\/(admin|api|auth|r|offline)(\/|\?|#|$)/.test(path)) return path;
  const prefix = localePrefix(await getLocale());
  return prefix && !path.startsWith(`${prefix}/`) && path !== prefix ? `${prefix}${path === "/" ? "" : path}` : path;
}

/** `redirect()` that keeps the visitor's language. Use in server components and server actions. */
export async function localeRedirect(path: string): Promise<never> {
  nextRedirect(await localizedPath(path));
}
