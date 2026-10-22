import { NextResponse, type NextRequest } from "next/server";
import { localePrefix } from "@/i18n/routing";
import { verifyUnsubscribe } from "@/lib/email/links";
import { applyUnsubscribe, unsubscribeTarget } from "@/lib/email/unsubscribe";

// List-Unsubscribe target (outside the locale routes, open through the coming-soon gate).
// POST — RFC 8058 one-click (List-Unsubscribe-Post: List-Unsubscribe=One-Click): mail clients call it without a
//        browser, so it applies the token straight away and answers 200.
// GET  — a person opening the header link: send them to the confirmation page in their language, keeping `t`.

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const payload = verifyUnsubscribe(request.nextUrl.searchParams.get("t"));
  if (!payload) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  const ok = await applyUnsubscribe(payload);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const t = request.nextUrl.searchParams.get("t") ?? "";
  const target = await unsubscribeTarget(verifyUnsubscribe(t));
  const url = new URL(`${localePrefix(target?.locale)}/unsubscribe`, request.nextUrl.origin);
  if (t) url.searchParams.set("t", t);
  return NextResponse.redirect(url, 303);
}
