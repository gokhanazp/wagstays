import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate only: exposes the path to server components (for ?next= redirects) and
// bounces signed-out visitors away from private areas. Real authorization happens in src/lib/auth.ts.
const PRIVATE = ["/admin", "/account", "/sitter", "/messages", "/favourites", "/book"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPrivate = PRIVATE.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPrivate && !request.cookies.has("ws_session")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname + search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images|favicon.ico).*)"],
};
