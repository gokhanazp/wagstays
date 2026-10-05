import type { Metadata } from "next";
import { bookingPets, petNames } from "@/lib/pets";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { BOOKING_STATUSES, BOOKING_STATUS_LABELS, SERVICE_LABELS, SERVICE_TYPES, type BookingStatus, type ServiceType } from "@/lib/constants";
import { BTN, Card, EmptyState, INPUT, LABEL, PageHeader, Pager, StatusChip, TD, TH, Table, formatDate } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { DatePicker } from "@/components/forms/DatePicker";
import { PAGE_SIZE, baseWhere, bookingWhere, filterHref, findBookings, parseBookingFilters, shortRef } from "./_lib";

const th = TH.replace("px-space-lg", "px-space-md");
const td = TD.replace("px-space-lg", "px-space-md");
const formatTime = (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, timeStyle: "short" }).format(d);

const SERVICE_ICONS: Record<ServiceType, string> = { DOG_WALKING: "directions_walk", BOARDING: "night_shelter", DAY_CARE: "sunny", DROP_IN: "home" };
const DATE_FORMAT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };

export const metadata: Metadata = { title: "Bookings" };

export default async function AdminBookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const f = parseBookingFilters(await searchParams);
  const [statusGroups, total, sitters] = await Promise.all([
    db.booking.groupBy({ by: ["status"], where: baseWhere(f), _count: true }),
    db.booking.count({ where: bookingWhere(f) }),
    db.sitterProfile.findMany({ select: { id: true, displayName: true }, orderBy: { displayName: "asc" } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(f.page, pageCount);
  const rows = await findBookings(f, { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE });

  const counts = Object.fromEntries(statusGroups.map((g) => [g.status, g._count])) as Partial<Record<BookingStatus, number>>;
  const allCount = statusGroups.reduce((n, g) => n + g._count, 0);
  const statuses = BOOKING_STATUSES.filter((s) => s !== "DRAFT" || counts.DRAFT);
  const hasFilters = Boolean(f.service || f.sitter || f.q || f.from || f.to);

  return (
    <>
      <PageHeader
        actions={
          <a className={BTN.secondary} download href={filterHref(f, { page: undefined }, "/admin/bookings/export")}>
            <span className="material-symbols-outlined text-xl">download</span>
            Export CSV
          </a>
        }
        description="Every booking on the platform. Filter, open a booking to step in, or export the current view."
        eyebrow="Operations"
        title="Bookings"
      />

      {/* Status tabs with counts (respecting the other filters) */}
      <nav aria-label="Filter by status" className="flex gap-space-xs overflow-x-auto pb-1 -mx-margin-mobile px-margin-mobile md:mx-0 md:px-0">
        <StatusTab active={!f.status} count={allCount} href={filterHref(f, { status: undefined, page: undefined })} label="All" />
        {statuses.map((s) => (
          <StatusTab
            key={s}
            active={f.status === s}
            count={counts[s] ?? 0}
            href={filterHref(f, { status: s, page: undefined })}
            label={BOOKING_STATUS_LABELS[s].label}
          />
        ))}
      </nav>

      <Card className="p-space-lg">
        <form action="/admin/bookings" className="grid grid-cols-2 lg:grid-cols-6 gap-space-sm md:gap-space-md items-end" method="get">
          {f.status && <input name="status" type="hidden" value={f.status} />}
          <label className="flex flex-col gap-space-xs col-span-2">
            <span className={LABEL}>Owner</span>
            <span className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl">search</span>
              <input className={`${INPUT} pl-10`} defaultValue={f.q} name="q" placeholder="Name or email" type="search" />
            </span>
          </label>
          <label className="flex flex-col gap-space-xs lg:col-span-2">
            <span className={LABEL}>Service</span>
            <Select
              aria-label="Service"
              defaultValue={f.service ?? ""}
              name="service"
              options={[{ value: "", label: "All services", icon: "pets" }, ...SERVICE_TYPES.map((t) => ({ value: t, label: SERVICE_LABELS[t], icon: SERVICE_ICONS[t] }))]}
            />
          </label>
          <label className="flex flex-col gap-space-xs lg:col-span-2">
            <span className={LABEL}>Sitter</span>
            <Select
              aria-label="Sitter"
              defaultValue={f.sitter ?? ""}
              name="sitter"
              options={[{ value: "", label: "All sitters" }, ...sitters.map((s) => ({ value: s.id, label: s.displayName }))]}
            />
          </label>
          <label className="flex flex-col gap-space-xs">
            <span className={LABEL}>Starts from</span>
            <DatePicker aria-label="Starts from" defaultValue={f.from} format={DATE_FORMAT} name="from" placeholder="Any date" />
          </label>
          <label className="flex flex-col gap-space-xs">
            <span className={LABEL}>Starts until</span>
            <DatePicker aria-label="Starts until" defaultValue={f.to} format={DATE_FORMAT} name="to" placeholder="Any date" />
          </label>
          <label className="flex flex-col gap-space-xs col-span-2">
            <span className={LABEL}>Sort</span>
            <Select
              aria-label="Sort"
              defaultValue={f.sort}
              name="sort"
              options={[
                { value: "upcoming", label: "Upcoming first", icon: "event_upcoming" },
                { value: "newest", label: "Newest first", icon: "schedule" },
              ]}
            />
          </label>
          <div className="flex flex-wrap gap-space-sm col-span-2 justify-end">
            {(hasFilters || f.sort !== "upcoming") && (
              <Link className={BTN.ghost} href={f.status ? `/admin/bookings?status=${f.status}` : "/admin/bookings"}>
                Clear filters
              </Link>
            )}
            <button className={BTN.sage} type="submit">
              <span className="material-symbols-outlined text-xl">filter_list</span>
              Apply
            </button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-space-lg pt-space-lg pb-space-sm">
          <h2 className="font-title-md text-title-md text-on-surface">
            {total} booking{total === 1 ? "" : "s"}
          </h2>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Times in Toronto (ET)</span>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon="event_busy" text="No bookings match these filters. Try widening the date range or clearing the search." title="No bookings found" />
        ) : (
          <div className="px-space-sm pb-space-sm">
            <Table>
              <thead>
                <tr>
                  <th className={th}>Ref</th>
                  <th className={th}>Owner</th>
                  <th className={th}>Pet</th>
                  <th className={th}>Sitter · Service</th>
                  <th className={th}>Start</th>
                  <th className={`${th} text-right`}>Total</th>
                  <th className={th}>Status</th>
                  <th className={th}>Flags</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  const st = BOOKING_STATUS_LABELS[b.status as BookingStatus] ?? { label: b.status, tone: "neutral" as const };
                  return (
                    <tr key={b.id} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className={td}>
                        <Link className="font-label-lg text-label-lg text-primary hover:underline whitespace-nowrap" href={`/admin/bookings/${b.id}`}>
                          {shortRef(b.id)}
                        </Link>
                      </td>
                      <td className={td}>
                        <div className="flex flex-col">
                          <span className="whitespace-nowrap">
                            {b.owner.firstName} {b.owner.lastName}
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">{b.owner.email}</span>
                        </div>
                      </td>
                      <td className={td}>
                        {petNames(bookingPets(b).map((p) => p.name))}
                        {b.petCount > 1 && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-semibold whitespace-nowrap" data-testid="admin-pet-count">
                            {b.petCount} pets
                          </span>
                        )}
                      </td>
                      <td className={td}>
                        <div className="flex flex-col whitespace-nowrap">
                          <span>{b.sitter.displayName}</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">{SERVICE_LABELS[b.service.type as ServiceType] ?? b.service.type}</span>
                        </div>
                      </td>
                      <td className={td}>
                        <div className="flex flex-col whitespace-nowrap">
                          <span>{formatDate(b.startAt, b.sitter.city.timeZone)}</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">{formatTime(b.startAt, b.sitter.city.timeZone)}</span>
                        </div>
                      </td>
                      <td className={`${td} text-right whitespace-nowrap`}>{formatMoney(b.totalCents, { exact: true })}</td>
                      <td className={td}>
                        <StatusChip tone={st.tone}>{st.label}</StatusChip>
                      </td>
                      <td className={td}>
                        <div className="flex gap-1">
                          {b.meetAndGreet && (
                            <span aria-label="Meet & Greet requested" className="material-symbols-outlined text-xl text-secondary" role="img" title="Meet & Greet requested">
                              handshake
                            </span>
                          )}
                          {b.recurringWeekly && (
                            <span aria-label="Repeats weekly" className="material-symbols-outlined text-xl text-primary" role="img" title="Repeats weekly">
                              event_repeat
                            </span>
                          )}
                          {!b.meetAndGreet && !b.recurringWeekly && <span className="text-outline">—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
        <Pager hrefFor={(p) => filterHref(f, { page: p })} page={page} pageCount={pageCount} />
      </Card>
    </>
  );
}

function StatusTab({ href, label, count, active }: { href: string; label: string; count: number; active: boolean }) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-space-xs h-10 px-space-md rounded-full font-label-lg text-label-lg whitespace-nowrap border transition-all ${
        active ? "bg-primary-container text-on-primary border-transparent shadow-sm" : "bg-surface-container-lowest text-on-surface-variant border-[#EFE7DE] hover:text-on-surface"
      }`}
      href={href}
    >
      {label}
      <span className={`min-w-6 h-6 px-1.5 rounded-full inline-flex items-center justify-center font-label-sm text-label-sm ${active ? "bg-white/20" : "bg-surface-container-high"}`}>
        {count}
      </span>
    </Link>
  );
}
