import type { NextRequest } from "next/server";
import { bookingPets, petNames } from "@/lib/pets";
import { getAdminOrNull } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { BOOKING_STATUS_LABELS, SERVICE_LABELS, type BookingStatus, type ServiceType } from "@/lib/constants";
import { todayIso } from "@/lib/booking-time";
import { findBookings, parseBookingFilters, shortRef } from "../_lib";

/** RFC 4180 field: quote when needed, double embedded quotes; neutralise spreadsheet formulas. */
function cell(v: string | number | boolean | null | undefined) {
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const dollars = (cents: number) => (cents / 100).toFixed(2);

function enCA(d: Date | null, tz: string) {
  if (!d) return "";
  // en-CA gives "2026-10-18, 09:00" — ISO-like and sortable in spreadsheets
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(d)
    .replace(",", "");
}

export async function GET(request: NextRequest) {
  const admin = await getAdminOrNull();
  if (!admin) return new Response("Not found", { status: 404 });

  const sp = Object.fromEntries(request.nextUrl.searchParams);
  const f = parseBookingFilters(sp);
  const rows = await findBookings(f);

  const header = [
    "Ref", "Booking ID", "Status", "Owner", "Owner email", "Pets", "Pet count", "Sitter", "Service", "Start (local)", "End (local)", "Time zone",
    "Meet & Greet", "Recurring weekly", "Subtotal (CAD)", "WagShield (CAD)", "Service fee (CAD)", "Discount (CAD)", "Tax (CAD)", "Total (CAD)", "Created",
  ];
  const lines = [header.map(cell).join(",")];
  for (const b of rows) {
    const tz = b.sitter.city.timeZone;
    lines.push(
      [
        shortRef(b.id),
        b.id,
        BOOKING_STATUS_LABELS[b.status as BookingStatus]?.label ?? b.status,
        `${b.owner.firstName} ${b.owner.lastName}`,
        b.owner.email,
        petNames(bookingPets(b).map((p) => p.name)),
        b.petCount,
        b.sitter.displayName,
        SERVICE_LABELS[b.service.type as ServiceType] ?? b.service.type,
        enCA(b.startAt, tz),
        enCA(b.endAt, tz),
        tz,
        b.meetAndGreet ? "Yes" : "No",
        b.recurringWeekly ? "Yes" : "No",
        dollars(b.subtotalCents),
        dollars(b.protectionFeeCents),
        dollars(b.serviceFeeCents),
        dollars(b.discountCents),
        dollars(b.taxCents),
        dollars(b.totalCents),
        enCA(b.createdAt, tz),
      ]
        .map(cell)
        .join(","),
    );
  }

  await audit(admin.id, "booking.export", "Booking", "*", { filters: sp, rows: rows.length });

  // BOM so Excel opens UTF-8 names correctly
  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wagstays-bookings-${todayIso()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
