import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Refreshes the Supabase session, exposes the path to server components (for ?next= redirects) and
// bounces signed-out visitors away from private areas. Real authorization happens in src/lib/auth.ts.
const PRIVATE = ["/admin", "/account", "/sitter", "/messages", "/favourites", "/book"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname + search);
  const { response, signedIn } = await updateSession(request, headers);

  const isPrivate = PRIVATE.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPrivate && !signedIn) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg)$).*)"],
};
