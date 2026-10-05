import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { localePrefix, routing } from "@/i18n/routing";
import { refreshSession } from "@/lib/supabase/proxy";

// Refreshes the Supabase session, resolves the site language (/fr/... or the WAG_LOCALE cookie), exposes the path
// to server components (for ?next= redirects) and bounces signed-out visitors away from private areas.
// Real authorization happens in src/lib/auth.ts.
const PRIVATE = ["/admin", "/account", "/sitter", "/messages", "/favourites", "/book"];
// English-only areas outside app/[locale]
const NO_LOCALE = ["/admin", "/api", "/auth", "/r", "/offline", "/manifest.webmanifest", "/sitemap.xml", "/robots.txt", "/sw.js"];

const intl = createIntlMiddleware(routing);
const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { cookies, signedIn } = await refreshSession(request);
  request.headers.set("x-pathname", pathname + search);

  const localized = !NO_LOCALE.some((p) => under(pathname, p));
  const locale = routing.locales.find((l) => l !== routing.defaultLocale && under(pathname, `/${l}`));
  const appPath = locale ? pathname.slice(locale.length + 1) || "/" : pathname;

  let response: NextResponse;
  if (PRIVATE.some((p) => under(appPath, p)) && !signedIn) {
    const url = new URL(`${localePrefix(locale)}/login`, request.url);
    url.searchParams.set("next", pathname + search);
    response = NextResponse.redirect(url);
  } else if (localized) {
    response = intl(request);
  } else {
    response = NextResponse.next({ request: { headers: request.headers } });
  }
  cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|ico|js|json|txt|xml)$).*)"],
};
