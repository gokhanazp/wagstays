const FALLBACK = "https://wagstays.vercel.app";

/**
 * Public origin for canonical URLs, the sitemap, robots.txt and JSON-LD.
 * NEXT_PUBLIC_SITE_URL wins; a localhost value is ignored on Vercel production builds (falls back to the
 * project's production domain) so a stale env var can't put localhost URLs into the sitemap.
 */
export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined;
  const isLocal = !!env && /localhost|127\.0\.0\.1/.test(env);
  const url = env && !(isLocal && process.env.VERCEL_ENV === "production") ? env : (vercelProd ?? FALLBACK);
  return url.replace(/\/$/, "");
}

/** "/sitters/x" → "https://…/sitters/x" */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export const SITE_NAME = "WagStays";

/**
 * `alternates` metadata for a page that exists in every site language: canonical points at this language's URL and
 * hreflang links point at the others. `path` is the English path ("/sitters/x").
 *   alternates: localeAlternates("/pricing", locale)
 */
export function localeAlternates(path: string, locale: string) {
  const fr = `/fr${path === "/" ? "" : path}`;
  return {
    canonical: locale === "fr" ? fr : path,
    languages: { "en-CA": path, "fr-CA": fr, "x-default": path },
  };
}
