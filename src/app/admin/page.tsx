import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { APPLICATION_STATUS_LABELS, BOOKING_STATUS_LABELS, DEFAULT_TIME_ZONE, SERVICE_LABELS, type ApplicationStatus, type BookingStatus, type ServiceType } from "@/lib/constants";
import { lastDaysInZone, startOfMonthInZone, zonedIsoDate } from "@/lib/admin-core";
import { BTN, Card, CardHeader, EmptyState, PageHeader, StatCard, StatusChip, TD, TH, Table, formatDate, formatDateTime } from "@/components/ui";
import { BarChart } from "./_components/BarChart";
import { AuditList } from "./_components/AuditList";
import { auditInclude, toAuditRows } from "./_components/audit-rows";

export const metadata: Metadata = { title: "Dashboard" };

const TZ = DEFAULT_TIME_ZONE;
const PLACED = { not: "DRAFT" } as const;
const EARNING = ["CONFIRMED", "COMPLETED"];
const NEW_OWNER = { role: "OWNER", deletedAt: null } as const;

export default async function AdminDashboard() {
  const now = new Date();
  const monthStart = startOfMonthInZone(now, TZ);
  const days = lastDaysInZone(now, TZ, 30);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600_000);

  const [
    activeSitters,
    owners,
    bookingsThisMonth,
    money,
    pendingApplications,
    pendingBookings,
    rating,
    recentBookingsForChart,
    applications,
    latestBookings,
    auditLogs,
    cities,
    bookingsByCity,
    hoods,
    newOwnersCount,
    newOwners,
    notReadyCount,
  ] = await Promise.all([
    db.sitterProfile.count({ where: { status: "ACTIVE", user: { suspended: false } } }),
    db.user.count({ where: { role: "OWNER" } }),
    db.booking.count({ where: { status: PLACED, createdAt: { gte: monthStart } } }),
    db.booking.aggregate({
      where: { status: { in: EARNING }, createdAt: { gte: monthStart } },
      _sum: { totalCents: true, serviceFeeCents: true, protectionFeeCents: true },
    }),
    db.sitterApplication.count({ where: { status: { in: ["IN_REVIEW", "MEET_GREET"] } } }),
    db.booking.count({ where: { status: "PENDING" } }),
    db.review.aggregate({ where: { hidden: false }, _avg: { rating: true }, _count: true }),
    db.booking.findMany({ where: { status: PLACED, createdAt: { gte: days[0].start } }, select: { createdAt: true } }),
    db.sitterApplication.findMany({ where: { status: { in: ["IN_REVIEW", "MEET_GREET"] } }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.booking.findMany({
      where: { status: PLACED },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { owner: { select: { firstName: true, lastName: true } }, sitter: { select: { displayName: true } }, service: { select: { type: true } } },
    }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: auditInclude }),
    db.city.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: { _count: { select: { sitters: true, neighbourhoods: true } }, sitters: { where: { status: "ACTIVE" }, select: { id: true } } },
    }),
    db.booking.findMany({ where: { status: PLACED }, select: { status: true, totalCents: true, sitter: { select: { cityId: true } } } }),
    db.neighbourhood.findMany({ select: { slug: true, name: true } }),
    db.user.count({ where: { ...NEW_OWNER, createdAt: { gte: weekAgo } } }),
    db.user.findMany({
      where: { ...NEW_OWNER, createdAt: { gte: weekAgo } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, firstName: true, lastName: true, email: true, createdAt: true, approvalStatus: true },
    }),
    db.user.count({ where: { role: "OWNER", deletedAt: null, suspended: false, OR: [{ phone: null }, { phone: "" }, { pets: { none: { archivedAt: null } } }] } }),
  ]);
  const hoodName = new Map(hoods.map((h) => [h.slug, h.name]));

  const gmv = money._sum.totalCents ?? 0;
  const revenue = (money._sum.serviceFeeCents ?? 0) + (money._sum.protectionFeeCents ?? 0);

  const perDay = new Map<string, number>();
  for (const b of recentBookingsForChart) {
    const k = zonedIsoDate(b.createdAt, TZ);
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }
  const fmtShort = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, month: "short", day: "numeric" });
  const fmtLong = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" });
  const chart = days.map((d) => {
    const mid = new Date(d.start.getTime() + 12 * 3600_000);
    return { key: d.iso, short: fmtShort.format(mid), label: fmtLong.format(mid), value: perDay.get(d.iso) ?? 0 };
  });

  const cityStats = new Map<string, { bookings: number; gmv: number }>();
  for (const b of bookingsByCity) {
    const s = cityStats.get(b.sitter.cityId) ?? { bookings: 0, gmv: 0 };
    s.bookings++;
    if (EARNING.includes(b.status)) s.gmv += b.totalCents;
    cityStats.set(b.sitter.cityId, s);
  }

  const monthName = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, month: "long" }).format(now);

  return (
    <>
      <PageHeader
        actions={
          <>
            <Link className={BTN.secondary} href="/admin/applications">
              <span className="material-symbols-outlined text-xl">assignment_ind</span>Review applications
            </Link>
            <Link className={BTN.primary} href="/admin/bookings?status=PENDING">
              <span className="material-symbols-outlined text-xl">event_note</span>Pending bookings
            </Link>
          </>
        }
        description={`How WagStays is doing in ${monthName} (Toronto time, CAD incl. HST).`}
        eyebrow="Admin"
        title="Dashboard"
      />

      <section aria-label="Key metrics" className="grid grid-cols-2 xl:grid-cols-4 gap-space-sm md:gap-space-md">
        <StatCard hint="Accepting bookings now" icon="volunteer_activism" label="Active sitters" value={activeSitters} />
        <StatCard hint="Registered pet parents" icon="pets" label="Pet parents" tone="tertiary" value={owners} />
        <StatCard hint={`Placed since ${monthName} 1`} icon="event_available" label="Bookings this month" tone="secondary" value={bookingsThisMonth} />
        <StatCard hint="Confirmed + completed" icon="payments" label="GMV this month" value={formatMoney(gmv, { exact: true })} />
        <StatCard hint="Service + WagShield fees" icon="account_balance" label="Platform revenue" tone="tertiary" value={formatMoney(revenue, { exact: true })} />
        <StatCard
          hint={
            <Link className="text-primary hover:underline" href="/admin/applications">
              In review or Meet &amp; Greet
            </Link>
          }
          icon="assignment_ind"
          label="Pending applications"
          tone="secondary"
          value={pendingApplications}
        />
        <StatCard
          hint={
            <Link className="text-primary hover:underline" href="/admin/bookings?status=PENDING">
              Awaiting sitter response
            </Link>
          }
          icon="hourglass_top"
          label="Pending bookings"
          value={pendingBookings}
        />
        <StatCard
          hint={`${rating._count} published review${rating._count === 1 ? "" : "s"}`}
          icon="star"
          label="Average rating"
          tone="tertiary"
          value={rating._avg.rating ? rating._avg.rating.toFixed(2) : "—"}
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-space-lg">
        <Card className="flex flex-col gap-space-md pb-space-lg">
          <CardHeader icon="bar_chart" title="Bookings, last 30 days" />
          <div className="px-space-lg">
            <BarChart data={chart} label="Bookings placed per day over the last 30 days" />
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            action={
              <Link className="font-label-md text-label-md text-primary hover:underline" href="/admin/applications">
                View all
              </Link>
            }
            icon="assignment_ind"
            title="Applications needing action"
          />
          {applications.length === 0 ? (
            <EmptyState icon="task_alt" text="New sitter applications will show up here." title="You're all caught up" />
          ) : (
            <ul className="flex flex-col p-space-sm pt-space-md">
              {applications.map((a) => {
                const s = APPLICATION_STATUS_LABELS[a.status as ApplicationStatus];
                return (
                  <li key={a.id}>
                    <Link className="flex items-center justify-between gap-space-md px-space-md py-space-sm rounded-xl hover:bg-surface-container-low" href={`/admin/applications/${a.id}`}>
                      <span className="flex flex-col min-w-0">
                        <span className="font-label-lg text-label-lg text-on-surface truncate">
                          {a.firstName} {a.lastName}
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                          {a.neighbourhood ? (hoodName.get(a.neighbourhood) ?? a.neighbourhood) : "—"} · {formatDate(a.createdAt)}
                        </span>
                      </span>
                      {s && <StatusChip tone={s.tone}>{s.label}</StatusChip>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-space-lg">
        <Card className="flex flex-col">
          <CardHeader
            action={
              <Link className="font-label-md text-label-md text-primary hover:underline" href="/admin/users">
                Pet parents
              </Link>
            }
            icon="person_add"
            title="New pet parents this week"
          />
          <div className="px-space-lg pt-space-sm flex items-baseline gap-space-sm">
            <span className="font-headline-md text-headline-md text-on-surface">{newOwnersCount}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">signed up in the last 7 days</span>
          </div>
          {newOwners.length === 0 ? (
            <EmptyState icon="person_add" title="No new sign-ups this week" />
          ) : (
            <ul className="flex flex-col p-space-sm">
              {newOwners.map((u) => (
                <li key={u.id}>
                  <Link className="flex items-center justify-between gap-space-md px-space-md py-space-sm rounded-xl hover:bg-surface-container-low" href={`/admin/users/${u.id}`}>
                    <span className="flex flex-col min-w-0">
                      <span className="font-label-lg text-label-lg text-on-surface truncate">
                        {u.firstName} {u.lastName}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                        {u.email} · {formatDate(u.createdAt)}
                      </span>
                    </span>
                    {u.approvalStatus === "PENDING" ? (
                      <StatusChip icon="hourglass_top" tone="warning">
                        Pending
                      </StatusChip>
                    ) : u.approvalStatus === "REJECTED" ? (
                      <StatusChip tone="danger">Rejected</StatusChip>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-space-sm pb-space-lg">
          <CardHeader icon="pending_actions" title="Profiles not ready to book" />
          <div className="px-space-lg flex items-baseline gap-space-sm">
            <span className="font-headline-md text-headline-md text-on-surface">{notReadyCount}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">pet parent{notReadyCount === 1 ? "" : "s"} with no phone number or no pet yet</span>
          </div>
          <p className="px-space-lg font-body-sm text-body-sm text-on-surface-variant">
            They can browse, but checkout asks them to finish these steps before their first booking.
          </p>
          <div className="px-space-lg">
            <Link className={BTN.secondary} href="/admin/users?ready=no">
              <span className="material-symbols-outlined text-xl">group</span>View in Pet Parents
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-lg">
        <Card className="flex flex-col">
          <CardHeader
            action={
              <Link className="font-label-md text-label-md text-primary hover:underline" href="/admin/bookings">
                View all
              </Link>
            }
            icon="event_note"
            title="Latest bookings"
          />
          {latestBookings.length === 0 ? (
            <EmptyState icon="event_busy" title="No bookings yet" />
          ) : (
            <ul className="flex flex-col p-space-sm pt-space-md">
              {latestBookings.map((b) => {
                const s = BOOKING_STATUS_LABELS[b.status as BookingStatus];
                return (
                  <li key={b.id}>
                    <Link className="flex items-center justify-between gap-space-md px-space-md py-space-sm rounded-xl hover:bg-surface-container-low" href={`/admin/bookings/${b.id}`}>
                      <span className="flex flex-col min-w-0">
                        <span className="font-label-lg text-label-lg text-on-surface truncate">
                          {b.owner.firstName} {b.owner.lastName} → {b.sitter.displayName}
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                          {SERVICE_LABELS[b.service.type as ServiceType] ?? b.service.type} · {formatDateTime(b.startAt)} · {formatMoney(b.totalCents, { exact: true })}
                        </span>
                      </span>
                      {s && <StatusChip tone={s.tone}>{s.label}</StatusChip>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            action={
              <Link className="font-label-md text-label-md text-primary hover:underline" href="/admin/audit">
                Full log
              </Link>
            }
            icon="history"
            title="Recent admin activity"
          />
          <div className="pt-space-md pb-space-sm">
            {auditLogs.length === 0 ? <EmptyState icon="history" title="No admin activity yet" /> : <AuditList compact rows={toAuditRows(auditLogs)} />}
          </div>
        </Card>
      </div>

      <Card className="flex flex-col">
        <CardHeader
          action={
            <Link className="font-label-md text-label-md text-primary hover:underline" href="/admin/cities">
              Manage cities
            </Link>
          }
          icon="location_city"
          title="Cities"
        />
        <div className="p-space-sm pt-space-md">
          <Table>
            <thead>
              <tr>
                <th className={TH}>City</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}>Neighbourhoods</th>
                <th className={`${TH} text-right`}>Sitters (active)</th>
                <th className={`${TH} text-right`}>Bookings</th>
                <th className={`${TH} text-right`}>GMV (all time)</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((c) => {
                const s = cityStats.get(c.id) ?? { bookings: 0, gmv: 0 };
                return (
                  <tr key={c.id}>
                    <td className={TD}>
                      <Link className="font-label-lg text-label-lg text-on-surface hover:text-primary" href={`/admin/cities/${c.id}`}>
                        {c.name}
                      </Link>
                      <span className="font-body-sm text-body-sm text-on-surface-variant"> · {c.provinceCode}</span>
                    </td>
                    <td className={TD}>{c.isActive ? <StatusChip tone="success">Live</StatusChip> : <StatusChip>Inactive</StatusChip>}</td>
                    <td className={`${TD} text-right`}>{c._count.neighbourhoods}</td>
                    <td className={`${TD} text-right`}>
                      {c._count.sitters} <span className="text-on-surface-variant">({c.sitters.length})</span>
                    </td>
                    <td className={`${TD} text-right`}>{s.bookings}</td>
                    <td className={`${TD} text-right`}>{formatMoney(s.gmv, { exact: true })}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </Card>
    </>
  );
}
