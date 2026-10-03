import { NextResponse, type NextRequest } from "next/server";
import { REF_COOKIE, REF_COOKIE_MAX_AGE, findReferrer } from "@/lib/referrals";

// Referral share link: /r/<code> remembers who invited the visitor (30-day httpOnly cookie) and sends them to sign up.
// Unknown codes just redirect without setting anything.
export async function GET(request: NextRequest, ctx: RouteContext<"/r/[code]">) {
  const { code } = await ctx.params;
  const res = NextResponse.redirect(new URL("/signup", request.url));
  const referrer = await findReferrer(code);
  if (referrer?.referralCode) {
    res.cookies.set(REF_COOKIE, referrer.referralCode, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: REF_COOKIE_MAX_AGE,
    });
  }
  return res;
}
