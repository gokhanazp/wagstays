import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Card, EmptyState, PageHeader, Pager } from "@/components/ui";
import { requireSitter } from "@/lib/auth";
import { db } from "@/lib/db";
import { BookingCard, bookingCardInclude } from "../_components/BookingCard";
import { seriesPositions } from "@/lib/booking-series";

export const metadata: Metadata = { title: "Requests & Bookings | WagStays" };

const PAGE_SIZE = 10;

const TABS = {
  requests: { label: "Requests", icon: "mark_email_unread", where: { status: "PENDING" }, order: "asc", empty: "No pending requests right now." },
  upcoming: { label: "Upcoming", icon: "event_available", where: { status: "CONFIRMED" }, order: "asc", empty: "No confirmed bookings yet." },
  past: { label: "Past", icon: "history", where: { status: "COMPLETED" }, order: "desc", empty: "Completed bookings will appear here." },
  cancelled: {
    label: "Cancelled & Declined",
    icon: "event_busy",
    where: { status: { in: ["CANCELLED", "DECLINED"] } },
    order: "desc",
    empty: "Nothing cancelled or declined.",
  },
} satisfies Record<string, { label: string; icon: string; where: Prisma.BookingWhereInput; order: "asc" | "desc"; empty: string }>;
type TabKey = keyof typeof TABS;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SitterBookingsPage({ searchParams }: PageProps<"/sitter/bookings">) {
  const { profile } = await requireSitter();
  const sp = await searchParams;
  const tab: TabKey = (one(sp.tab) as TabKey) in TABS ? (one(sp.tab) as TabKey) : "requests";
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);
  const t = TABS[tab];

  const [counts, total, bookings] = await Promise.all([
    db.booking.groupBy({ by: ["status"], where: { sitterId: profile.id }, _count: true }),
    db.booking.count({ where: { sitterId: profile.id, ...t.where } }),
    db.booking.findMany({
      where: { sitterId: profile.id, ...t.where },
      include: bookingCardInclude,
      orderBy: { startAt: t.order },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const count = (...s: string[]) => counts.filter((c) => s.includes(c.status)).reduce((n, c) => n + c._count, 0);
  const tabCounts: Record<TabKey, number> = {
    requests: count("PENDING"),
    upcoming: count("CONFIRMED"),
    past: count("COMPLETED"),
    cancelled: count("CANCELLED", "DECLINED"),
  };
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const series = await seriesPositions(bookings);

  return (
    <>
      <PageHeader
        description="Respond to new requests, keep track of upcoming visits and look back on past stays."
        eyebrow="Sitter Dashboard"
        title="Requests & Bookings"
      />
      <Card>
        <nav aria-label="Booking status" className="flex gap-space-xs overflow-x-auto p-space-sm border-b border-[#EFE7DE]">
          {(Object.keys(TABS) as TabKey[]).map((k) => {
            const active = k === tab;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-space-xs h-10 px-space-md rounded-full font-label-lg text-label-lg whitespace-nowrap transition-colors ${
                  active ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low"
                }`}
                href={`/sitter/bookings?tab=${k}`}
                key={k}
              >
                <span className="material-symbols-outlined text-lg">{TABS[k].icon}</span>
                {TABS[k].label}
                <span className={`min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center font-label-sm text-label-sm ${active ? "bg-white/20" : "bg-surface-container-high"}`}>
                  {tabCounts[k]}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col gap-space-md p-space-lg">
          {bookings.length ? (
            bookings.map((b) => <BookingCard booking={b} key={b.id} series={series.get(b.id)} tz={profile.city.timeZone} withActions={tab === "requests"} />)
          ) : (
            <EmptyState icon={t.icon} text={t.empty} title={`No ${t.label.toLowerCase()} bookings`} />
          )}
        </div>
        <Pager hrefFor={(p) => `/sitter/bookings?tab=${tab}&page=${p}`} page={Math.min(page, pageCount)} pageCount={pageCount} />
      </Card>
    </>
  );
}
