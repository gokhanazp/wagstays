import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { localePrefix, routing } from "@/i18n/routing";
import { isLive, PREVIEW_COOKIE, previewGateEnabled, previewToken } from "@/lib/site-mode";
import { refreshSession } from "@/lib/supabase/proxy";

// Refreshes the Supabase session, resolves the site language (/fr/... or the WAG_LOCALE cookie), exposes the path
// to server components (for ?next= redirects) and bounces signed-out visitors away from private areas.
// Real authorization happens in src/lib/auth.ts.
const PRIVATE = ["/admin", "/account", "/sitter", "/messages", "/favourites", "/book"];
// English-only areas outside app/[locale]
const NO_LOCALE = ["/admin", "/api", "/auth", "/r", "/offline", "/preview", "/manifest.webmanifest", "/sitemap.xml", "/robots.txt", "/sw.js"];

// Reachable without the preview cookie while the site is in "coming soon" mode
// legal pages stay public before launch (CASL: the privacy policy must be reachable from the consent form)
const GATE_OPEN = ["/coming-soon", "/fr/coming-soon", "/unsubscribe", "/fr/unsubscribe", "/preview", "/api/cron", "/api/email", "/auth", "/offline", "/manifest.webmanifest", "/robots.txt", "/sitemap.xml", "/sw.js", "/privacy", "/fr/privacy", "/terms", "/fr/terms", "/pipeda", "/fr/pipeda"];

const intl = createIntlMiddleware(routing);
const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

// Old production hostname → the real domain (keeps API/cron calls working on the old host)
const LEGACY_HOST = "wagstays.vercel.app";
const CANONICAL_ORIGIN = "https://www.wagstays.ca";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (request.headers.get("host") === LEGACY_HOST && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(`${CANONICAL_ORIGIN}${pathname}${search}`, 308);
  }
  const { cookies, signedIn } = await refreshSession(request);
  request.headers.set("x-pathname", pathname + search);

  const localized = !NO_LOCALE.some((p) => under(pathname, p));
  const locale = routing.locales.find((l) => l !== routing.defaultLocale && under(pathname, `/${l}`));
  const appPath = locale ? pathname.slice(locale.length + 1) || "/" : pathname;

  let response: NextResponse;
  const gated =
    previewGateEnabled() &&
    !GATE_OPEN.some((p) => under(pathname, p)) &&
    request.cookies.get(PREVIEW_COOKIE)?.value !== (await previewToken());
  if (gated) {
    // pre-launch: everyone without the team access link sees the coming-soon page (in their language)
    const lang = locale ?? (request.cookies.get("WAG_LOCALE")?.value === "fr" ? "fr" : routing.defaultLocale);
    request.headers.set("X-NEXT-INTL-LOCALE", lang); // what next-intl's own middleware would set
    response = NextResponse.rewrite(new URL(`/${lang}/coming-soon`, request.url), { request: { headers: request.headers } });
  } else if (PRIVATE.some((p) => under(appPath, p)) && !signedIn) {
    const url = new URL(`${localePrefix(locale)}/login`, request.url);
    url.searchParams.set("next", pathname + search);
    response = NextResponse.redirect(url);
  } else if (localized) {
    response = intl(request);
  } else {
    response = NextResponse.next({ request: { headers: request.headers } });
  }
  cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  // until launch nothing may be indexed — covers pages, route handlers and files alike
  if (!isLive()) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|ico|js|json|txt|xml)$).*)"],
};
