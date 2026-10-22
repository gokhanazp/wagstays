import { getAdminOrNull } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { todayIso } from "@/lib/booking-time";
import { db } from "@/lib/db";

/** RFC 4180 field: quote when needed, double embedded quotes; neutralise spreadsheet formulas. */
function cell(v: string | null | undefined) {
  if (v === null || v === undefined) return "";
  let s = v;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CASL consent records for every subscriber (including unsubscribed ones — the proof must be kept). */
export async function GET() {
  const admin = await getAdminOrNull();
  if (!admin) return new Response("Not found", { status: 404 });

  const rows = await db.newsletterSubscriber.findMany({ orderBy: { createdAt: "asc" } });
  const lines = [["email", "locale", "source", "consentText", "createdAt", "unsubscribedAt"].join(",")];
  for (const s of rows) {
    lines.push([s.email, s.locale, s.source, s.consentText, s.createdAt.toISOString(), s.unsubscribedAt?.toISOString() ?? null].map(cell).join(","));
  }
  await audit(admin.id, "newsletter.export", "NewsletterSubscriber", "*", { rows: rows.length });

  // BOM so Excel opens UTF-8 (French) text correctly
  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wagstays-newsletter-${todayIso()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
