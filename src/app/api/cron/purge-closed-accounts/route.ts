import { NextResponse, type NextRequest } from "next/server";
import { purgeClosedAccounts } from "@/lib/privacy";

// Nightly Vercel Cron (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await purgeClosedAccounts();
  return NextResponse.json({ ok: true, ...result });
}
