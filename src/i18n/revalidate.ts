import { revalidatePath as nextRevalidatePath } from "next/cache";
import { routing } from "./routing";

/**
 * revalidatePath for pages under app/[locale]: English URLs are rewritten to /en/... internally, so each
 * language's copy is revalidated. Paths outside [locale] (e.g. /admin) are passed through unchanged too.
 */
export function revalidatePath(path: string, type?: "layout" | "page") {
  nextRevalidatePath(path, type);
  if (path.startsWith("/admin") || path.startsWith("/api")) return;
  for (const l of routing.locales) nextRevalidatePath(`/${l}${path === "/" ? "" : path}`, type);
}
