import { NextResponse, type NextRequest } from "next/server";
import { isValidPreviewCode, PREVIEW_COOKIE, previewToken } from "@/lib/site-mode";

// Team access while the site is in "coming soon" mode:
//   /preview?code=…   → remembers this browser for 30 days and opens the site
//   /preview?exit=1   → forgets it (back to the coming-soon page)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const home = new URL("/", request.url);

  if (searchParams.get("exit")) {
    const res = NextResponse.redirect(home);
    res.cookies.delete(PREVIEW_COOKIE);
    return res;
  }
  if (!(await isValidPreviewCode(searchParams.get("code")))) {
    return NextResponse.redirect(new URL("/coming-soon", request.url));
  }
  const res = NextResponse.redirect(home);
  res.cookies.set(PREVIEW_COOKIE, (await previewToken())!, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
