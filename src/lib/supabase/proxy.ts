import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: Parameters<import("next/server").NextResponse["cookies"]["set"]>[2] };

/**
 * Refreshes the Supabase session on every request. Refreshed cookies are written onto `request` (so the page
 * rendering after the proxy sees them) and returned so the caller can copy them onto whatever response it sends.
 */
export async function refreshSession(request: NextRequest) {
  const cookies: CookieToSet[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("WagStays: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set — see docs/DEPLOY.md.");
    return { cookies, signedIn: false };
  }
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        cookies.push(...list);
      },
    },
  });
  // getClaims() validates the JWT locally (or getUser() remotely) and refreshes expired sessions.
  const { data } = await supabase.auth.getClaims();
  return { cookies, signedIn: !!data?.claims?.sub };
}
