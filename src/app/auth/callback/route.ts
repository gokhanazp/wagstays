import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { emit } from "@/lib/events";

// Landing point for Supabase email links (sign-up confirmation, password reset, invites) using the PKCE code.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Older sign-up confirmation links land here too: an address confirmed just now gets the welcome email (sent once).
      const confirmedAt = data.user?.email_confirmed_at ? Date.parse(data.user.email_confirmed_at) : 0;
      if (data.user && Date.now() - confirmedAt < 10 * 60_000) emit({ type: "user.emailConfirmed", userId: data.user.id });
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
