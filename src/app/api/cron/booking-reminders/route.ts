import { NextResponse, type NextRequest } from "next/server";
import { runBookingReminders } from "@/lib/email/templates/booking-reminders";

// Daily Vercel Cron (see vercel.json): day-before booking reminders + nudges for unanswered requests.
// Vercel sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runBookingReminders();
  return NextResponse.json({ ok: true, ...result });
}
